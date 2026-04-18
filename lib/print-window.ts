import { waitForExportReady } from "@/lib/similar-export";

export async function printElementInNewWindow(root: HTMLDivElement, title: string) {
  await waitForExportReady(root);

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
  if (!printWindow) {
    throw new Error("인쇄 창을 열 수 없습니다. 팝업 차단을 확인해 주세요.");
  }

  const styleNodes = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${styleNodes}
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
    const finalize = () => resolve();
    printWindow.addEventListener("load", () => finalize(), { once: true });
    window.setTimeout(() => finalize(), 1200);
  });

  printWindow.focus();
  printWindow.print();
}
