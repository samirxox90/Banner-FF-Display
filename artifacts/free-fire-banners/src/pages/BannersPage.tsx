import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  Loader2,
  AlertCircle,
  Search,
  X,
  Sparkles,
  ShoppingBag,
  LayoutGrid,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REGIONS = [
  { code: "SG", name: "Singapore" },
  { code: "BD", name: "Bangladesh" },
  { code: "IND", name: "India" },
  { code: "CIS", name: "CIS" },
  { code: "EU", name: "Europe" },
  { code: "NA", name: "North America" },
  { code: "PK", name: "Pakistan" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "ME", name: "Middle East" },
  { code: "BR", name: "Brazil" },
  { code: "LATAM", name: "Latin America" },
  { code: "VN", name: "Vietnam" },
  { code: "TW", name: "Taiwan" },
];

type Tab = "banners" | "store";

interface BannerItem {
  slno: number;
  filename: string;
  request_name: string;
  url: string;
}

interface ApiResponse {
  success: boolean;
  server: string;
  categories: {
    backgrounds?: { total: number; items: BannerItem[] };
    booyahpass?: { total: number; items: BannerItem[] };
    loading?: { total: number; items: BannerItem[] };
    html?: { total: number; items: BannerItem[] };
    others?: { total: number; items: BannerItem[] };
  };
}

function cleanUrl(raw: string): string {
  if (!raw) return raw;
  // Extract clean URL up to and including the file extension
  const extMatch = raw.match(/^(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%.]+?\.(jpg|jpeg|png|gif|webp|svg|mp4|mp3|ogg|html|json))/i);
  if (extMatch) return extMatch[1];
  // Fallback: strip non-ASCII and control chars from the end
  const cleaned = raw.replace(/[^\x20-\x7E]+.*$/, "").trim();
  return cleaned || raw;
}

function fetchBanners(region: string): Promise<ApiResponse> {
  return fetch(`/api/banners?server=${region}`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch banners");
    return r.json();
  });
}

function FFLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ffGrad1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#FF3D00" />
        </linearGradient>
        <linearGradient id="ffGrad2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FF6B00" />
        </linearGradient>
      </defs>
      {/* Hexagon background */}
      <path
        d="M16 2L28 8.5V23.5L16 30L4 23.5V8.5L16 2Z"
        fill="url(#ffGrad1)"
      />
      {/* Inner hex ring */}
      <path
        d="M16 5L25.5 10.25V21.75L16 27L6.5 21.75V10.25L16 5Z"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.5"
      />
      {/* Lightning bolt / stylized "F" shape */}
      <path
        d="M19.5 8H13L10 16H14L11 24H13.5L23 14.5H18.5L21.5 8Z"
        fill="white"
        opacity="0.95"
      />
    </svg>
  );
}

function BannerCard({ item }: { item: BannerItem }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const url = cleanUrl(item.url);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        toast({ description: "URL copied!" });
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [url, toast]
  );

  const handleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [url]
  );

  const isImage =
    !url.endsWith(".html") &&
    !url.endsWith(".mp4") &&
    !url.endsWith(".mp3") &&
    !url.endsWith(".ogg") &&
    !url.startsWith("https://discord.gg");

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.04] group transition-all duration-200 hover:border-orange-500/30 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-orange-950/30">
      {isImage && !imgError ? (
        <div className="relative w-full aspect-[21/9] bg-black/40 overflow-hidden">
          <img
            src={url}
            alt={item.request_name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button
            onClick={handleOpen}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/60 hover:bg-orange-500 backdrop-blur-sm flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100 border border-white/10"
            title="Open in new tab"
          >
            <ExternalLink size={13} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="relative w-full aspect-[21/9] bg-black/30 flex items-center justify-center border-b border-white/5">
          <div className="text-center text-white/20 px-4">
            <ExternalLink size={24} className="mx-auto mb-2" />
            <p className="text-xs break-all leading-relaxed line-clamp-2">{url.replace(/^https?:\/\//, "")}</p>
          </div>
          <button
            onClick={handleOpen}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/50 hover:bg-orange-500 flex items-center justify-center transition-all duration-150 border border-white/10"
          >
            <ExternalLink size={13} className="text-white" />
          </button>
        </div>
      )}

      <div className="px-3.5 py-3 flex items-center justify-between gap-3">
        <p
          className="text-sm font-medium text-white/80 truncate leading-snug"
          title={item.request_name}
        >
          {item.request_name}
        </p>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 ${
            copied
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-white/5 hover:bg-orange-500 text-white/50 hover:text-white border border-white/8 hover:border-orange-500"
          }`}
        >
          {copied ? (
            <><Check size={11} /> Copied</>
          ) : (
            <><Copy size={11} /> Copy URL</>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const [region, setRegion] = useState("IND");
  const [activeTab, setActiveTab] = useState<Tab>("banners");
  const [regionOpen, setRegionOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["banners", region],
    queryFn: () => fetchBanners(region),
    staleTime: 5 * 60 * 1000,
  });

  const selectedRegion = REGIONS.find((r) => r.code === region) ?? REGIONS[0];

  const allItems = useMemo((): BannerItem[] => {
    if (!data?.categories) return [];
    const cats = data.categories;
    const combined = [
      ...(cats.loading?.items ?? []),
      ...(cats.backgrounds?.items ?? []),
      ...(cats.booyahpass?.items ?? []),
      ...(cats.html?.items ?? []),
      ...(cats.others?.items ?? []),
    ];
    // Sort by slno descending so most recently added show first
    return [...combined].sort((a, b) => b.slno - a.slno);
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase();
    return allItems.filter(
      (item) =>
        item.request_name.toLowerCase().includes(q) ||
        cleanUrl(item.url).toLowerCase().includes(q)
    );
  }, [allItems, search]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "banners", label: "Banners", icon: <LayoutGrid size={14} /> },
    { id: "store", label: "Store", icon: <ShoppingBag size={14} /> },
  ];

  function renderContent() {
    if (activeTab === "store") {
      return (
        <div className="flex flex-col items-center justify-center py-28 gap-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-700/10 border border-orange-500/20 flex items-center justify-center">
              <ShoppingBag size={40} className="text-orange-500/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
              <Sparkles size={10} className="text-white" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-white/90 tracking-tight">Coming Soon</h3>
            <p className="text-white/40 text-sm max-w-xs leading-relaxed">
              The Store section is under construction. Exclusive items and bundles will appear here soon.
            </p>
          </div>
          <div className="flex gap-1.5 mt-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-orange-500/50 animate-bounce"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={30} className="text-orange-500 animate-spin" />
          <p className="text-white/30 text-sm">Loading banners for {selectedRegion.name}…</p>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <AlertCircle size={30} className="text-red-500/70" />
          <p className="text-white/30 text-sm">Failed to load banners. Try a different region.</p>
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Search size={28} className="text-white/20" />
          <p className="text-white/30 text-sm">
            {search ? `No results for "${search}"` : "No banners available for this region."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/25 font-medium">
            {filteredItems.length} banner{filteredItems.length !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => (
            <BannerCard key={`${item.slno}-${item.request_name}`} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white">
      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#0d0f14] pt-4 pb-3">
          {/* Logo + title */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <FFLogo />
              <div>
                <h1 className="text-base font-bold text-white leading-none tracking-wide">FF Login Banners</h1>
                <p className="text-[10px] text-orange-500/70 font-medium tracking-widest uppercase mt-0.5">Free Fire Asset Viewer</p>
              </div>
            </div>

            {/* Region Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRegionOpen((p) => !p)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/8 text-white/70 hover:text-white border border-white/8 hover:border-orange-500/40 transition-all duration-150"
              >
                <span className="text-xs font-mono text-orange-400 font-bold">{selectedRegion.code}</span>
                <span className="text-white/40">|</span>
                <span className="text-xs">{selectedRegion.name}</span>
                <ChevronDown size={12} className={`transition-transform text-white/40 ${regionOpen ? "rotate-180" : ""}`} />
              </button>
              {regionOpen && (
                <div className="absolute top-full mt-2 right-0 w-52 bg-[#161920] border border-white/8 rounded-xl shadow-2xl z-30 overflow-hidden">
                  <div className="py-1.5 max-h-72 overflow-y-auto">
                    {REGIONS.map((r) => (
                      <button
                        key={r.code}
                        onClick={() => { setRegion(r.code); setRegionOpen(false); }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                          r.code === region
                            ? "bg-orange-500/15 text-orange-400 font-semibold"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{r.name}</span>
                        <span className={`text-xs font-mono ${r.code === region ? "text-orange-400" : "text-white/30"}`}>{r.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white/5 text-white/50 hover:bg-white/8 hover:text-white border border-white/6"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar — only on banners tab */}
          {activeTab === "banners" && (
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search banners by name or URL…"
                className="w-full bg-white/5 border border-white/8 focus:border-orange-500/50 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Bottom border */}
          <div className="mt-3 h-px bg-gradient-to-r from-orange-500/20 via-white/5 to-transparent" />
        </header>

        {/* Overlay to close region dropdown */}
        {regionOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setRegionOpen(false)} />
        )}

        <main className="mt-5">{renderContent()}</main>
      </div>
    </div>
  );
}
