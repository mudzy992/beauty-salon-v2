import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import api from "../../api/client";
import { isSuccessfulCampaignUnsubscribeResponse } from "../../features/notifications/campaign-unsubscribe-data.mjs";

type UnsubscribeStatus =
  "confirm" | "submitting" | "success" | "invalid" | "failed";

export default function CampaignUnsubscribe() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<UnsubscribeStatus>(
    token ? "confirm" : "invalid",
  );
  const requestGeneration = useRef(0);
  const requestInFlight = useRef(false);

  useEffect(() => {
    requestGeneration.current += 1;
    requestInFlight.current = false;
    setStatus(token ? "confirm" : "invalid");
    return () => {
      requestGeneration.current += 1;
      requestInFlight.current = false;
    };
  }, [token]);

  const unsubscribe = async () => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    if (requestInFlight.current) return;
    const generation = ++requestGeneration.current;
    const submittedToken = token;
    requestInFlight.current = true;
    setStatus("submitting");
    try {
      const { data } = await api.post<unknown>(
        "/api/notifications/campaigns/unsubscribe",
        { token: submittedToken },
      );
      if (generation !== requestGeneration.current) return;
      if (!isSuccessfulCampaignUnsubscribeResponse(data)) {
        throw new Error("Invalid campaign unsubscribe response");
      }
      setStatus("success");
    } catch (error: unknown) {
      if (generation !== requestGeneration.current) return;
      const responseStatus =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      setStatus(responseStatus === 400 ? "invalid" : "failed");
    } finally {
      if (generation === requestGeneration.current) {
        requestInFlight.current = false;
      }
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
  const isErrorStatus = status === "invalid" || status === "failed";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12">
      <Card className="w-full">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div
            className="space-y-2"
            role={isErrorStatus ? "alert" : "status"}
            aria-live={isErrorStatus ? "assertive" : "polite"}
            aria-atomic="true"
          >
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
              aria-busy={status === "submitting"}
            >
              {status === "submitting" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
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
