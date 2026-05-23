import { useState, useMemo, useCallback, useEffect, useTransition, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check, Copy, ExternalLink, ChevronDown, Loader2,
  AlertCircle, Search, X, Sparkles, ShoppingBag, LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── Regions ─── */
const REGIONS = [
  { code: "SG",    name: "Singapore" },
  { code: "BD",    name: "Bangladesh" },
  { code: "IND",   name: "India" },
  { code: "CIS",   name: "CIS" },
  { code: "EU",    name: "Europe" },
  { code: "NA",    name: "North America" },
  { code: "PK",    name: "Pakistan" },
  { code: "ID",    name: "Indonesia" },
  { code: "TH",    name: "Thailand" },
  { code: "ME",    name: "Middle East" },
  { code: "BR",    name: "Brazil" },
  { code: "LATAM", name: "Latin America" },
  { code: "VN",    name: "Vietnam" },
  { code: "TW",    name: "Taiwan" },
];

/* Region code → actual API param (some regions differ) */
const REGION_API_CODE: Record<string, string> = {
  ME: "MEA",
};
function apiCode(region: string): string {
  return REGION_API_CODE[region] ?? region;
}

/* Per-region quick-filter chips */
const REGION_FILTERS: Record<string, string[]> = {
  SG:    ["Tab", "1400x700"],
  IND:   ["Tab", "1400x700"],
  BD:    ["Tab", "1400x700"],
  CIS:   ["Tab", "1400x700"],
  EU:    ["Tab", "1400x700"],
  NA:    ["Tab", "1400x700"],
  PK:    ["Tab", "1400x700"],
  ID:    ["Tab", "1400x700", "Overview"],
  VN:    ["Tab", "1400x700"],
  LATAM: ["Tab", "1400x700"],
  BR:    ["Tab", "1400x700"],
  ME:    ["Tab", "1400x700", "BG"],
  TW:    ["180x80", "1400x700"],
  TH:    ["TabTH", "1400x700"],
};

/* Group priority: EVENTS first = most recent */
const GROUP_ORDER = [
  "EVENTS", "LUCKROYALE", "MISSION", "TOPUP",
  "BOOYAHPASS", "PATCH", "SOCIALS_HTML", "OTHERS",
];

type Tab = "banners" | "store";

/* ─── API shapes ─── */
interface ApiResponseNew {
  success: boolean;
  server: string;
  total_assets?: number;
  groups: Record<string, string[]>;
}
interface LegacyItem {
  slno: number;
  filename: string;
  request_name: string;
  url: string;
}
interface ApiResponseOld {
  success: boolean;
  server: string;
  categories: {
    backgrounds?: { items: LegacyItem[] };
    booyahpass?:  { items: LegacyItem[] };
    loading?:     { items: LegacyItem[] };
    html?:        { items: LegacyItem[] };
    others?:      { items: LegacyItem[] };
  };
}
type ApiResponse = ApiResponseNew | ApiResponseOld;

/* Normalised item */
interface BannerItem {
  id: string;
  request_name: string;
  url: string;
  group: string;
}

/* ─── URL helpers ─── */
function cleanUrl(raw: string): string {
  if (!raw) return raw;
  let url = raw.replace(/[^\x20-\x7E]+.*$/, "").trim();
  url = url.replace(/\/common\/[a-z]{1,6}\/common\//gi, "/common/");
  url = url.replace(/\/common\/[-0-9a-zA-Z]{1,4}(OB\d+)\//gi, "/common/$1/");
  const extMatch = url.match(
    /^(https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|svg|mp4|mp3|ogg|html|json|ktx))/i
  );
  return extMatch ? extMatch[1] : url;
}

function nameFromUrl(rawUrl: string): string {
  const url = cleanUrl(rawUrl);
  const seg = url.split("/").pop() ?? url;
  let name = seg.replace(/\.(jpg|jpeg|png|gif|webp|svg|mp4|mp3|ogg|html|json|ktx)$/i, "");
  name = name.replace(/[_-](IND|SG|BD|CIS|EU|NA|PK|ID|TH|ME|MEA|BR|LATAM|VN|TW)[_-]?(en|hi|ar|th|vn|es|pt|zh|ru|id|tr)?$/i, "");
  name = name.replace(/[_-](en|hi|ar|th|vn|es|pt|zh|ru|id|tr)$/i, "");
  return name || seg;
}

/* ─── Junk filter ─── */
const JUNK_RE = /discord\.gg|facebook\.com|youtube\.com|youtu\.be|whatsapp\.com|linktr\.ee|ffredirect|t\.me\/|instagram\.com|twitter\.com|tiktok\.com|docs\.google\.com|ff\.redirect|ff\.article\.en|ff\.garena\.com|esports\.freefire|PreviewBG|167\.png/i;

function isJunkUrl(url: string): boolean {
  return JUNK_RE.test(url);
}

/* ─── Normalise → BannerItem[] ─── */
function normaliseItems(data: ApiResponse): BannerItem[] {
  const items: BannerItem[] = [];

  if ("groups" in data && data.groups) {
    const groups = data.groups as Record<string, string[]>;
    const processed = new Set<string>();
    for (const groupKey of [...GROUP_ORDER, ...Object.keys(groups)]) {
      if (processed.has(groupKey)) continue;
      processed.add(groupKey);
      const urls: string[] = groups[groupKey] ?? [];
      urls.forEach((rawUrl, i) => {
        const url = cleanUrl(rawUrl);
        if (!url || isJunkUrl(url)) return;
        items.push({ id: `${groupKey}-${i}-${url.slice(-20)}`, request_name: nameFromUrl(rawUrl), url, group: groupKey });
      });
    }
    return items;
  }

  if ("categories" in data && data.categories) {
    const cats = (data as ApiResponseOld).categories;
    const legacy = [
      ...(cats.loading?.items ?? []),
      ...(cats.backgrounds?.items ?? []),
      ...(cats.booyahpass?.items ?? []),
      ...(cats.html?.items ?? []),
      ...(cats.others?.items ?? []),
    ].sort((a, b) => b.slno - a.slno);
    legacy.forEach((item) => {
      const url = cleanUrl(item.url);
      if (!url || isJunkUrl(url)) return;
      items.push({ id: `legacy-${item.slno}-${item.request_name}`, request_name: item.request_name, url, group: "LEGACY" });
    });
    return items;
  }

  return items;
}

/* ─── Fetch ─── */
function fetchBanners(region: string): Promise<ApiResponse> {
  return fetch(`/api/banners?server=${apiCode(region)}`).then((r) => {
    if (!r.ok) throw new Error("fetch failed");
    return r.json();
  });
}

/* ─── Logo ─── */
function FFLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ffG1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF3D00" />
        </linearGradient>
      </defs>
      <path d="M16 2L28 8.5V23.5L16 30L4 23.5V8.5L16 2Z" fill="url(#ffG1)" />
      <path d="M16 5L25.5 10.25V21.75L16 27L6.5 21.75V10.25L16 5Z"
            fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <path d="M19.5 8H13L10 16H14L11 24H13.5L23 14.5H18.5L21.5 8Z"
            fill="white" opacity="0.95" />
    </svg>
  );
}

/* ─── Group badge ─── */
const GROUP_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  EVENTS:       { bg: "bg-orange-500/15", text: "text-orange-400",  dot: "bg-orange-400"  },
  LUCKROYALE:   { bg: "bg-yellow-500/15", text: "text-yellow-400",  dot: "bg-yellow-400"  },
  BOOYAHPASS:   { bg: "bg-purple-500/15", text: "text-purple-400",  dot: "bg-purple-400"  },
  TOPUP:        { bg: "bg-green-500/15",  text: "text-green-400",   dot: "bg-green-400"   },
  PATCH:        { bg: "bg-blue-500/15",   text: "text-blue-400",    dot: "bg-blue-400"    },
  MISSION:      { bg: "bg-cyan-500/15",   text: "text-cyan-400",    dot: "bg-cyan-400"    },
  SOCIALS_HTML: { bg: "bg-pink-500/15",   text: "text-pink-400",    dot: "bg-pink-400"    },
  OTHERS:       { bg: "bg-white/8",       text: "text-white/40",    dot: "bg-white/30"    },
  LEGACY:       { bg: "bg-white/8",       text: "text-white/40",    dot: "bg-white/30"    },
};
const GROUP_LABEL: Record<string, string> = {
  EVENTS: "Events", LUCKROYALE: "Lucky Royale", BOOYAHPASS: "Booyah Pass",
  TOPUP: "Top-Up", PATCH: "Patch Notes", MISSION: "Mission",
  SOCIALS_HTML: "Socials / HTML", OTHERS: "Others", LEGACY: "Legacy",
};

function GroupBadge({ group }: { group: string }) {
  const s = GROUP_STYLES[group] ?? GROUP_STYLES.OTHERS;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border border-white/5 ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {GROUP_LABEL[group] ?? group}
    </span>
  );
}

/* ─── Banner Card (memoised) ─── */
const BannerCard = memo(function BannerCard({ item }: { item: BannerItem }) {
  const { toast } = useToast();
  const [copied, setCopied]     = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      toast({ description: "URL copied!" });
      setTimeout(() => setCopied(false), 2000);
    });
  }, [item.url, toast]);

  const handleOpen = useCallback(() => {
    window.open(item.url, "_blank", "noopener,noreferrer");
  }, [item.url]);

  const isImage = !/\.(html|mp4|mp3|ogg|ktx|pvr|astc|json)$/i.test(item.url);

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.04] hover:border-orange-500/25 hover:bg-white/[0.06]"
         style={{ transition: "border-color 120ms, background-color 120ms" }}>

      {isImage && !imgError ? (
        <div className="relative w-full bg-black/40 overflow-hidden" style={{ aspectRatio: "21/9" }}>
          <img
            src={item.url}
            alt={item.request_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <GroupBadge group={item.group} />
          </div>
          <button onClick={handleOpen}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/55 hover:bg-orange-500 flex items-center justify-center border border-white/10"
            style={{ transition: "background-color 100ms" }}
            title="Open">
            <ExternalLink size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="relative w-full bg-black/25 flex items-center justify-center border-b border-white/5"
             style={{ aspectRatio: "21/9" }}>
          <div className="text-center text-white/20 px-4 select-none">
            <ExternalLink size={20} className="mx-auto mb-1.5 opacity-40" />
            <p className="text-xs break-all line-clamp-2 leading-relaxed opacity-70">
              {item.url.replace(/^https?:\/\//, "")}
            </p>
          </div>
          <div className="absolute bottom-2 left-2">
            <GroupBadge group={item.group} />
          </div>
          <button onClick={handleOpen}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 hover:bg-orange-500 flex items-center justify-center border border-white/10"
            style={{ transition: "background-color 100ms" }}>
            <ExternalLink size={12} className="text-white" />
          </button>
        </div>
      )}

      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-white/75 truncate" title={item.request_name}>
          {item.request_name}
        </p>
        <button onClick={handleCopy}
          className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium border ${
            copied
              ? "bg-green-500/15 text-green-400 border-green-500/25"
              : "bg-white/5 hover:bg-orange-500 text-white/45 hover:text-white border-white/8 hover:border-orange-500"
          }`}
          style={{ transition: "background-color 100ms, color 100ms, border-color 100ms" }}>
          {copied ? <><Check size={11} />Copied</> : <><Copy size={11} />Copy URL</>}
        </button>
      </div>
    </div>
  );
});

/* ─── Hooks ─── */
function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

/* ─── Small helpers ─── */
function StatusView({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      {icon}
      <p className="text-white/25 text-sm text-center max-w-xs">{text}</p>
    </div>
  );
}

function StoreComing() {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-5">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-700/10 border border-orange-500/20 flex items-center justify-center">
          <ShoppingBag size={38} className="text-orange-500/55" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white/85 tracking-tight">Coming Soon</h3>
        <p className="text-white/35 text-sm max-w-xs leading-relaxed">
          The Store section is under construction. 252x256 &amp; 1500x750 Link Appear Soon.
        </p>
      </div>
      <div className="flex gap-1.5 mt-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-500/45 animate-bounce"
               style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function BannersPage() {
  const [region, setRegion]             = useState("IND");
  const [activeTab, setActiveTab]       = useState<Tab>("banners");
  const [regionOpen, setRegionOpen]     = useState(false);
  const [searchRaw, setSearchRaw]       = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const search         = useDebounce(searchRaw, 250);
  const selectedRegion = REGIONS.find((r) => r.code === region) ?? REGIONS[0];
  const quickFilters   = REGION_FILTERS[region] ?? [];

  /* Reset filters on region change */
  useEffect(() => {
    setActiveFilter(null);
    setSearchRaw("");
  }, [region]);

  const { data, isLoading, isError } = useQuery({
    queryKey:  ["banners-v2", region],
    queryFn:   () => fetchBanners(region),
    staleTime: 5 * 60 * 1000,
  });

  const allItems = useMemo((): BannerItem[] => {
    if (!data) return [];
    return normaliseItems(data);
  }, [data]);

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (activeFilter) {
      const af = activeFilter.toLowerCase();
      items = items.filter((i) => i.request_name.toLowerCase().includes(af) || i.url.toLowerCase().includes(af));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.request_name.toLowerCase().includes(q) || i.url.toLowerCase().includes(q));
    }
    return items;
  }, [allItems, search, activeFilter]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => setSearchRaw(e.target.value));
  }, []);
  const handleClearSearch = useCallback(() => startTransition(() => setSearchRaw("")), []);
  const handleFilterChip  = useCallback((chip: string) => {
    startTransition(() => {
      setActiveFilter((p) => (p === chip ? null : chip));
      setSearchRaw("");
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      <div className="max-w-2xl mx-auto px-4 pb-16">

        {/* ── Sticky header ── */}
        <header className="sticky top-0 z-20 bg-[#0d0f14] pt-4 pb-2">

          {/* Logo + region */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <FFLogo />
              <div>
                <h1 className="text-base font-bold text-white leading-none tracking-wide">FF Login Banners</h1>
                <p className="text-[10px] text-orange-500/70 font-medium tracking-widest uppercase mt-0.5">Free Fire Asset Viewer</p>
              </div>
            </div>

            {/* Region dropdown */}
            <div className="relative">
              <button onClick={() => setRegionOpen((p) => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/8 text-white/70 hover:text-white border border-white/8 hover:border-orange-500/40"
                style={{ transition: "background-color 100ms, border-color 100ms, color 100ms" }}>
                <span className="text-xs font-mono text-orange-400 font-bold">{selectedRegion.code}</span>
                <span className="text-white/30">|</span>
                <span className="text-xs">{selectedRegion.name}</span>
                <ChevronDown size={12} className={`text-white/35 ${regionOpen ? "rotate-180" : ""}`}
                  style={{ transition: "transform 150ms" }} />
              </button>

              {regionOpen && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-[#161920] border border-white/8 rounded-xl shadow-2xl z-30 overflow-hidden">
                  <div className="py-1.5 max-h-72 overflow-y-auto">
                    {REGIONS.map((r) => (
                      <button key={r.code}
                        onClick={() => { setRegion(r.code); setRegionOpen(false); }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-sm ${
                          r.code === region
                            ? "bg-orange-500/15 text-orange-400 font-semibold"
                            : "text-white/55 hover:bg-white/5 hover:text-white"
                        }`}
                        style={{ transition: "background-color 80ms" }}>
                        <span>{r.name}</span>
                        <span className={`text-xs font-mono ${r.code === region ? "text-orange-400" : "text-white/25"}`}>{r.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            {(["banners", "store"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold capitalize ${
                  activeTab === t
                    ? "bg-orange-500 text-white"
                    : "bg-white/5 text-white/45 hover:bg-white/8 hover:text-white border border-white/6"
                }`}
                style={{ transition: "background-color 100ms, color 100ms" }}>
                {t === "banners" ? <LayoutGrid size={13} /> : <ShoppingBag size={13} />}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Search + chips */}
          {activeTab === "banners" && (
            <>
              <div className="relative mb-2">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                <input
                  type="text"
                  value={searchRaw}
                  onChange={handleSearchChange}
                  placeholder="Search banners…"
                  className="w-full bg-white/[0.05] border border-white/8 focus:border-orange-500/50 rounded-xl pl-8 pr-8 py-2.5 text-sm text-white placeholder:text-white/25 outline-none"
                  style={{ transition: "border-color 100ms" }}
                />
                {searchRaw && (
                  <button onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-0.5"
                    style={{ transition: "color 80ms" }}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {quickFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {quickFilters.map((chip) => (
                    <button key={chip} onClick={() => handleFilterChip(chip)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        activeFilter === chip
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white/5 text-white/45 border-white/8 hover:bg-white/10 hover:text-white/80"
                      }`}
                      style={{ transition: "background-color 80ms, color 80ms" }}>
                      {chip}
                    </button>
                  ))}
                  {activeFilter && (
                    <button onClick={() => setActiveFilter(null)}
                      className="px-2 py-1 rounded-lg text-xs text-white/30 hover:text-white/60 flex items-center gap-1"
                      style={{ transition: "color 80ms" }}>
                      <X size={10} /> Clear
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-2 h-px bg-gradient-to-r from-orange-500/20 via-white/5 to-transparent" />
        </header>

        {regionOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setRegionOpen(false)} />
        )}

        {/* ── Content ── */}
        <main className="mt-4">
          {activeTab === "store" ? (
            <StoreComing />
          ) : isLoading ? (
            <StatusView
              icon={<Loader2 size={28} className="text-orange-500 animate-spin" />}
              text={`Loading banners for ${selectedRegion.name}…`} />
          ) : isError ? (
            <StatusView
              icon={<AlertCircle size={28} className="text-red-500/60" />}
              text="Failed to load banners. Try a different region." />
          ) : filteredItems.length === 0 ? (
            <StatusView
              icon={<Search size={26} className="text-white/20" />}
              text={activeFilter || search
                ? `No results for "${activeFilter ?? search}"`
                : "No banners found for this region."} />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-white/20 font-medium">
                {filteredItems.length} banner{filteredItems.length !== 1 ? "s" : ""}
                {(activeFilter || search) ? ` — "${activeFilter ?? search}"` : ""}
              </p>

              {filteredItems.map((item) => (
                <BannerCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
