import { waitForExportReady } from "@/lib/similar-export";

function serializeHeadStyles() {
  return Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => {
      if (node.tagName.toLowerCase() !== "link") {
        return node.outerHTML;
      }

      return `<link rel="stylesheet" href="${(node as HTMLLinkElement).href}" />`;
    })
    .join("\n");
}

async function waitForPrintWindowReady(printWindow: Window) {
  try {
    if ("fonts" in printWindow.document && "ready" in printWindow.document.fonts) {
      await printWindow.document.fonts.ready;
    }
  } catch {}

  await Promise.all(
    Array.from(printWindow.document.images).map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  await new Promise<void>((resolve) => printWindow.requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => printWindow.requestAnimationFrame(() => resolve()));
}

export async function printElementInNewWindow(root: HTMLDivElement, title: string) {
  await waitForExportReady(root);

  const printWindow = window.open("", "_blank", "width=1100,height=900");
  if (!printWindow) {
    throw new Error("인쇄 창을 열 수 없습니다. 팝업 차단을 확인해 주세요.");
  }

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${serializeHeadStyles()}
    <style>
      body {
        margin: 0;
        background: #d8d6d1;
      }

      .print-shell {
        display: grid;
        justify-content: center;
        gap: 24px;
        padding: 24px 0;
      }

      @media print {
        body {
          background: #fff;
        }

        .print-shell {
          padding: 0;
          gap: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-shell">${root.innerHTML}</div>
  </body>
</html>`);
  printWindow.document.close();

  await new Promise<void>((resolve) => {
    const finish = () => resolve();
    printWindow.addEventListener("load", finish, { once: true });
    window.setTimeout(finish, 1500);
  });

  await waitForPrintWindowReady(printWindow);

  printWindow.focus();
  printWindow.print();
}
