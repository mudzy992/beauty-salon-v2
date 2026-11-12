import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import api from "../../api/client";
import { MediaImage } from "../../components/media-image";
import { getUploadUrl } from "../../utils/uploadUrl";
import { BeforeAfterSpotlight } from "../../features/shell/public/before-after-spotlight";
import { publicAurum } from "../../features/shell/public/public-ui";
import { useTheme } from "../../features/shell/theme/theme-context";
import { PageHeader } from "../../features/shell/aurum/ui/page-header";
import { StatusBadge, type StatusDescriptor } from "../../features/shell/aurum/ui/status-badge";
import { Button } from "../../components/ui/button";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { Seo } from "../../seo/Seo";
import { getIntlLocale } from "../../i18n/locale-utils.mjs";

type Service = {
  id: string;
  name: string;
  shortDescription?: string | null;
  heroImage?: string | null;
  durationMinutes: number;
  price: number | string;
  gender?: "MALE" | "FEMALE" | null;
  subcategory?: {
    name?: string;
    category?: { name?: string };
  };
};

type PublicSalonIdentity = {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

type BeforeAfterPair = {
  id: string;
  before: {
    pathOriginal: string;
    pathMedium?: string | null;
    pathThumb?: string | null;
  };
  after: {
    pathOriginal: string;
    pathMedium?: string | null;
    pathThumb?: string | null;
  };
};

const PAGE_SIZE = 12;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOptionalString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string";

const isServiceResponse = (
  value: unknown,
  expectedId: string,
): value is Service =>
  isRecord(value) &&
  value.id === expectedId &&
  typeof value.name === "string" &&
  typeof value.durationMinutes === "number" &&
  (typeof value.price === "number" || typeof value.price === "string") &&
  Number.isFinite(Number(value.price)) &&
  isOptionalString(value.shortDescription) &&
  isOptionalString(value.heroImage);

const isImageAsset = (
  value: unknown,
): value is {
  pathOriginal: string;
  pathMedium?: string | null;
  pathThumb?: string | null;
} =>
  isRecord(value) &&
  typeof value.pathOriginal === "string" &&
  isOptionalString(value.pathMedium) &&
  isOptionalString(value.pathThumb);

const isBeforeAfterPair = (value: unknown): value is BeforeAfterPair =>
  isRecord(value) &&
  typeof value.id === "string" &&
  isImageAsset(value.before) &&
  isImageAsset(value.after);

export default function PublicServiceDetail() {
  const { serviceId } = useParams();
  const { t, i18n } = useTranslation();
  const { getSetting } = useSettings();
  const { user } = useAuth();
  const { skin } = useTheme();
  const isAurum = skin === "aurum";
  const [service, setService] = useState<Service | null>(null);
  const [salon, setSalon] = useState<PublicSalonIdentity | null>(null);
  const [loadingService, setLoadingService] = useState(true);
  const [serviceLoadError, setServiceLoadError] = useState(false);
  const [items, setItems] = useState<BeforeAfterPair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pairsLoadError, setPairsLoadError] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const serviceRequestIdRef = useRef(0);
  const galleryRequestIdRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const id = useMemo(() => (serviceId ?? "").trim(), [serviceId]);

  const loadService = useCallback(async () => {
    if (!id) {
      serviceRequestIdRef.current += 1;
      setService(null);
      setServiceLoadError(false);
      setLoadingService(false);
      return;
    }
    const requestId = ++serviceRequestIdRef.current;
    setLoadingService(true);
    setServiceLoadError(false);
    try {
      const { data } = await api.get<Service>(
        `/api/services/${encodeURIComponent(id)}`,
      );
      if (!isServiceResponse(data, id))
        throw new Error("Invalid public service response");
      if (requestId === serviceRequestIdRef.current) setService(data);
    } catch (error) {
      if (requestId === serviceRequestIdRef.current) {
        setService(null);
        setServiceLoadError(
          !(axios.isAxiosError(error) && error.response?.status === 404),
        );
      }
    } finally {
      if (requestId === serviceRequestIdRef.current) setLoadingService(false);
    }
  }, [id]);

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (!id) return;
      const requestId = ++galleryRequestIdRef.current;
      if (nextOffset === 0) setLoadingPairs(true);
      else setLoadingMore(true);
      setPairsLoadError(false);
      try {
        const { data } = await api.get<{
          items: BeforeAfterPair[];
          hasMore: boolean;
          nextOffset: number;
        }>("/api/daily-log/before-after", {
          params: { serviceId: id, limit: PAGE_SIZE, offset: nextOffset },
        });
        if (
          !Array.isArray(data?.items) ||
          !data.items.every(isBeforeAfterPair) ||
          (data.hasMore != null && typeof data.hasMore !== "boolean") ||
          (data.nextOffset != null &&
            (typeof data.nextOffset !== "number" ||
              !Number.isSafeInteger(data.nextOffset) ||
              data.nextOffset < 0))
        ) {
          throw new Error("Invalid before-and-after response");
        }
        const list = data.items;
        const nextPageHasMore = data.hasMore ?? false;
        const nextPageOffset = data.nextOffset ?? nextOffset + list.length;
        if (nextPageHasMore && nextPageOffset <= nextOffset) {
          throw new Error("Invalid before-and-after pagination offset");
        }
        if (requestId === galleryRequestIdRef.current) {
          setItems((prev) => (append ? [...prev, ...list] : list));
          setHasMore(nextPageHasMore);
          setOffset(nextPageOffset);
        }
      } catch {
        if (requestId === galleryRequestIdRef.current) {
          setHasMore(false);
          setPairsLoadError(true);
        }
      } finally {
        if (requestId === galleryRequestIdRef.current) {
          setLoadingPairs(false);
          setLoadingMore(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    void loadService();
    return () => {
      serviceRequestIdRef.current += 1;
    };
  }, [loadService]);

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setPairsLoadError(false);
    if (id) void loadPage(0, false);
    return () => {
      galleryRequestIdRef.current += 1;
    };
  }, [id, loadPage]);

  useEffect(() => {
    let active = true;
    api
      .get<PublicSalonIdentity | null>("/api/salon")
      .then(({ data }) => {
        if (active) setSalon(data);
      })
      .catch(() => {
        if (active) setSalon(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasMore || loadingMore || loadingPairs) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadPage(offset, true);
      },
      { rootMargin: "200px", threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingPairs, offset, loadPage]);

  if (loadingService) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="py-16 text-center text-slate-600"
      >
        {t("public.serviceDetail.loading")}
      </div>
    );
  }

  if (serviceLoadError) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center" role="alert">
          <p className="text-slate-600 mb-4">
            {t("public.serviceDetail.loadFailed")}
          </p>
          <Button variant="outline" onClick={() => void loadService()}>
            {t("public.serviceDetail.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          {isAurum ? (
            <PageHeader
              title={t("public.serviceDetail.notFound")}
              description={t("public.serviceDetail.notFoundHint")}
              actions={
                <Button asChild variant="outline">
                  <Link to="/usluge">
                    {t("public.serviceDetail.backToServices")}
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                {t("public.serviceDetail.notFound")}
              </h1>
              <p className="text-slate-600 mb-6">
                {t("public.serviceDetail.notFoundHint")}
              </p>
              <Button asChild variant="outline">
                <Link to="/usluge">
                  {t("public.serviceDetail.backToServices")}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const hasServiceHeroImage = Boolean(service.heroImage?.trim());
  const detailHeroBg = hasServiceHeroImage
    ? getUploadUrl(service.heroImage as string)
    : getSetting("public_services_bg", "");
  const heroImageAlt = t("public.serviceDetail.imageAlt", {
    service: service.name,
  });
  const canonicalPath = `/usluge/${service.id}`;
  const description = service.shortDescription?.trim() || service.name;
  const baseUrl =
    getSetting("public_site_base_url", "").replace(/\/$/, "") ||
    window.location.origin;
  const numericPrice = Number(service.price);
  const formattedPrice = Number.isFinite(numericPrice)
    ? new Intl.NumberFormat(
        getIntlLocale(i18n.resolvedLanguage || i18n.language),
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      ).format(numericPrice)
    : String(service.price);
  const showServicePrices = getSetting("public_service_prices_enabled", "true").toLowerCase() !== "false";
  const canBookService = !(user?.roles.includes("CLIENT") && user.gender === "MALE" && service.gender === "FEMALE");
  const categoryName =
    service.subcategory?.category?.name || service.subcategory?.name || "";
  const salonName = salon?.name?.trim() || "";
  const salonAddress =
    getSetting("public_contact_address", "").trim() ||
    salon?.address?.trim() ||
    "";
  const salonPhone =
    getSetting("public_contact_phone", "").trim() || salon?.phone?.trim() || "";
  const salonEmail =
    getSetting("public_contact_email", "").trim() || salon?.email?.trim() || "";
  const ogImage = hasServiceHeroImage
    ? detailHeroBg
    : getSetting("public_services_bg", "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description,
    provider: salonName
      ? {
          "@type": "LocalBusiness",
          name: salonName,
          url: baseUrl,
        }
      : undefined,
    url: `${baseUrl}${canonicalPath}`,
    image: ogImage
      ? ogImage.startsWith("http")
        ? ogImage
        : `${baseUrl}${ogImage}`
      : undefined,
    ...(showServicePrices
      ? {
          offers: {
            "@type": "Offer",
            price: numericPrice,
            priceCurrency: "BAM",
            url: `${baseUrl}/rezervacija?serviceId=${encodeURIComponent(service.id)}`,
          },
        }
      : {}),
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <Seo
        title={service.name}
        description={description}
        canonicalUrl={canonicalPath}
        og={{ image: ogImage }}
        twitter={{ image: ogImage }}
        jsonLd={jsonLd}
      />
      <div data-aurum-page="service-detail" className={`min-h-screen bg-[#fbf8f4] pb-20 text-[#352925] ${isAurum ? publicAurum.page : ""}`}>
        <section className="relative isolate overflow-hidden border-b border-[#e8ddd3] bg-[#f4eee7]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-36 -top-44 h-[36rem] w-[36rem] rounded-full border border-[#d5c1b0]/35"
          />
          <div className="mx-auto max-w-7xl px-4 pb-14 pt-7 sm:px-6 sm:pb-20 sm:pt-10 lg:px-8">
            <Link
              to="/usluge"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#725c4f] transition hover:text-[#49332d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9d735d]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("public.serviceDetail.allServices")}
            </Link>
            <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
              <div className="relative z-10">
                <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#80553e]">
                  {categoryName ? (
                    <span>{categoryName}</span>
                  ) : (
                    <span>{t("public.serviceDetail.kicker")}</span>
                  )}
                  {salonName ? <span className="text-[#b79b87]">·</span> : null}
                  {salonName ? (
                    <span className="text-[#806b5d]">{salonName}</span>
                  ) : null}
                </div>
                <h1 className={`max-w-3xl break-words text-5xl font-medium leading-[0.98] tracking-[-0.055em] text-[#382a25] sm:text-6xl lg:text-[5.25rem] ${isAurum ? publicAurum.heading : ""}`}>
                  {service.name}
                </h1>
                {service.shortDescription?.trim() ? (
                  <p className="mt-6 max-w-2xl text-base leading-7 text-[#75645a] sm:text-lg sm:leading-8">
                    {service.shortDescription}
                  </p>
                ) : null}
                <div className="mt-8 flex flex-wrap gap-3">
                  {showServicePrices ? (
                    <div data-detail-fact className="min-w-[9rem] rounded-2xl border border-[#e3d7cd] bg-white/80 px-4 py-3 shadow-sm">
                      <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#806b5d]">
                        {t("public.serviceDetail.priceLabel")}
                      </span>
                      <span className="mt-1 block text-lg font-semibold text-[#49332d]">
                        {formattedPrice} KM
                      </span>
                    </div>
                  ) : null}
                  <div data-detail-fact className="min-w-[9rem] rounded-2xl border border-[#e3d7cd] bg-white/80 px-4 py-3 shadow-sm">
                    <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#806b5d]">
                      {t("public.serviceDetail.durationLabel")}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-[#49332d]">
                      <Clock3
                        className="h-4 w-4 text-[#9b735f]"
                        aria-hidden="true"
                      />
                      {service.durationMinutes}{" "}
                      {t("public.serviceDetail.minutes")}
                    </span>
                  </div>
                  {categoryName ? (
                    <div data-detail-fact className="min-w-[9rem] rounded-2xl border border-[#e3d7cd] bg-white/80 px-4 py-3 shadow-sm">
                      <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#806b5d]">
                        {t("public.serviceDetail.categoryLabel")}
                      </span>
                      <span className="mt-1 block text-lg font-semibold text-[#49332d]">
                        {categoryName}
                      </span>
                    </div>
                  ) : null}
                  {isAurum && categoryName ? (
                    <StatusBadge
                      status={{
                        labelKey: "public.serviceDetail.categoryLabel",
                        tone: "neutral",
                        icon: Sparkles,
                      } as StatusDescriptor}
                      label={categoryName}
                      className="min-h-target items-center px-4 text-sm"
                    />
                  ) : null}
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {canBookService ? (
                    <Button
                      asChild
                      className="h-12 gap-2 rounded-full bg-[#49332d] px-6 text-white hover:bg-[#382722]"
                    >
                      <Link
                        to={`/rezervacija?serviceId=${encodeURIComponent(service.id)}`}
                      >
                        {t("public.serviceDetail.book")}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                  {salonPhone ? (
                    <a
                      href={`tel:${salonPhone}`}
                      aria-label={t("public.serviceDetail.callSalon", {
                        phone: salonPhone,
                      })}
                      data-detail-contact
                      className="inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border border-[#d5c4b8] bg-white/70 px-5 py-2 text-sm font-semibold text-[#49332d] hover:bg-white break-all"
                    >
                      <Phone className="h-4 w-4" aria-hidden="true" />
                      {salonPhone}
                    </a>
                  ) : null}
                  {salonEmail ? (
                    <a
                      href={`mailto:${salonEmail}`}
                      aria-label={t("public.serviceDetail.emailSalon", {
                        email: salonEmail,
                      })}
                      data-detail-contact
                      className="inline-flex min-h-12 max-w-full items-center gap-2 rounded-full border border-[#d5c4b8] bg-white/70 px-5 py-2 text-sm font-semibold text-[#49332d] hover:bg-white break-all"
                    >
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {salonEmail}
                    </a>
                  ) : null}
                </div>
                {salonAddress ? (
                  <p className="mt-5 flex items-center gap-2 text-sm text-[#75645a]">
                    <MapPin
                      className="h-4 w-4 shrink-0 text-[#9b735f]"
                      aria-hidden="true"
                    />
                    {salonAddress}
                  </p>
                ) : null}
              </div>
              <div className="relative mx-auto w-full max-w-[42rem] lg:ml-auto lg:max-w-none">
                <div
                  aria-hidden="true"
                  className="absolute -right-4 -top-4 h-24 w-24 rounded-full border border-[#bd9c83]/60 sm:-right-6 sm:-top-6 sm:h-36 sm:w-36"
                />
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br from-[#c6aa96] via-[#e6d8ca] to-[#8e7060] shadow-[0_28px_80px_-35px_rgba(63,42,32,0.5)] sm:aspect-[5/4]">
                  {detailHeroBg ? (
                    <MediaImage
                      src={detailHeroBg}
                      alt={heroImageAlt}
                      className="h-full w-full object-cover"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-br from-[#c6aa96] via-[#e6d8ca] to-[#8e7060]"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#241814]/60 via-transparent to-transparent"
                  />
                  <div data-detail-image-caption className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white sm:inset-x-7 sm:bottom-7">
                    <div>
                      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <p className="text-lg font-semibold tracking-[-0.02em] sm:text-xl">
                        {service.name}
                      </p>
                    </div>
                    {categoryName ? (
                      <span className="rounded-full border border-white/40 bg-white/20 px-3 py-1.5 text-xs font-medium backdrop-blur">
                        {categoryName}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          {loadingPairs && items.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="py-14 text-center text-slate-600"
            >
              {t("public.serviceDetail.loadingGallery")}
            </div>
          ) : pairsLoadError && items.length === 0 ? (
            <div className="py-14 text-center" role="alert">
              <p className="text-slate-600">
                {t("public.serviceDetail.galleryLoadFailed")}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void loadPage(0, false)}
              >
                {t("public.serviceDetail.retry")}
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div
              role="status"
              data-detail-empty-gallery
              className="rounded-[1.5rem] border border-[#e8ddd3] bg-white px-6 py-14 text-center shadow-[0_16px_50px_-38px_rgba(70,46,35,0.4)] md:py-20"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f2e6de] text-[#8d554d]">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#75645a]">
                {t("public.serviceDetail.noGalleryItems")}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#80553e]">
                  {t("public.serviceDetail.galleryEyebrow")}
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-[-0.04em] text-[#382a25] sm:text-4xl">
                  {t("public.serviceDetail.galleryTitle")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#79695e] sm:text-base">
                  {t("public.serviceDetail.gallerySubtitle")}
                </p>
              </div>
              <BeforeAfterSpotlight
                pairs={items}
                loading={false}
                resolveBefore={(p) =>
                  getUploadUrl(
                    p.before.pathMedium ??
                      p.before.pathThumb ??
                      p.before.pathOriginal,
                  )
                }
                resolveAfter={(p) =>
                  getUploadUrl(
                    p.after.pathMedium ??
                      p.after.pathThumb ??
                      p.after.pathOriginal,
                  )
                }
              />
              {pairsLoadError ? (
                <div className="py-5 text-center" role="alert">
                  <p className="text-slate-600">
                    {t("public.serviceDetail.galleryLoadFailed")}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => void loadPage(offset, true)}
                  >
                    {t("public.serviceDetail.retry")}
                  </Button>
                </div>
              ) : null}
              <div ref={sentinelRef} className="h-4 mt-8" />
              {loadingMore ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="py-8 text-center text-slate-600"
                >
                  {t("public.serviceDetail.loadingGallery")}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
