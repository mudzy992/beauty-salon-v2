import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import api from "../../api/client";

type UnsubscribeStatus =
  "confirm" | "submitting" | "success" | "invalid" | "failed";

export default function CampaignUnsubscribe() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<UnsubscribeStatus>(
    token ? "confirm" : "invalid",
  );

  const unsubscribe = async () => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    setStatus("submitting");
    try {
      const { data } = await api.post<{ ok: boolean; unsubscribed: boolean }>(
        "/api/notifications/campaigns/unsubscribe",
        { token },
      );
      setStatus(data.unsubscribed ? "success" : "invalid");
    } catch (error: unknown) {
      const responseStatus =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      setStatus(responseStatus === 400 ? "invalid" : "failed");
    }
  };

  const copy =
    status === "success"
      ? (["successTitle", "successDescription"] as const)
      : status === "invalid"
        ? (["invalidTitle", "invalidDescription"] as const)
        : status === "failed"
          ? (["failureTitle", "failureDescription"] as const)
          : (["title", "description"] as const);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12">
      <Card className="w-full">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {t(`campaignUnsubscribe.${copy[0]}`)}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t(`campaignUnsubscribe.${copy[1]}`)}
            </p>
          </div>
          {status === "confirm" || status === "submitting" ? (
            <Button
              type="button"
              onClick={() => void unsubscribe()}
              disabled={status === "submitting"}
            >
              {status === "submitting" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t(
                status === "submitting"
                  ? "campaignUnsubscribe.submitting"
                  : "campaignUnsubscribe.confirm",
              )}
            </Button>
          ) : null}
          {status === "failed" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void unsubscribe()}
            >
              {t("campaignUnsubscribe.retry")}
            </Button>
          ) : null}
          {status !== "confirm" &&
          status !== "submitting" &&
          status !== "failed" ? (
            <Button asChild variant="outline">
              <Link to="/">{t("campaignUnsubscribe.home")}</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
