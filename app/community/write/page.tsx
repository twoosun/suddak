import { Suspense } from "react";
import WritePageClient from "./WritePageClient";

export const dynamic = "force-dynamic";

export default function CommunityWritePage() {
  return (
    <Suspense fallback={null}>
      <WritePageClient />
    </Suspense>
  );
}