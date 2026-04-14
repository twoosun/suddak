export type OcrPreprocessOptions = {
  grayscale: boolean;
  increaseContrast: boolean;
  sharpen: boolean;
  threshold: boolean;
  deskewHint: boolean;
};

export const DEFAULT_OCR_PREPROCESS_OPTIONS: OcrPreprocessOptions = {
  grayscale: true,
  increaseContrast: true,
  sharpen: true,
  threshold: false,
  deskewHint: true,
};

/* # 1. 이미지 파일을 캔버스로 로드 */
async function loadImageToCanvas(file: File) {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("캔버스 컨텍스트를 만들 수 없습니다.");
  }

  ctx.drawImage(bitmap, 0, 0);
  return { canvas, ctx };
}

/* # 2. 픽셀 후처리 */
function processPixels(
  imageData: ImageData,
  options: OcrPreprocessOptions
): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // # 2-1. 흑백화
    if (options.grayscale) {
      const gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = gray;
      g = gray;
      b = gray;
    }

    // # 2-2. 대비 향상
    if (options.increaseContrast) {
      const contrast = 1.18;
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
    }

    // # 2-3. 단순 샤픈 느낌
    if (options.sharpen) {
      r *= 1.03;
      g *= 1.03;
      b *= 1.03;
    }

    // # 2-4. 이진화
    if (options.threshold) {
      const avg = (r + g + b) / 3;
      const value = avg > 185 ? 255 : 0;
      r = value;
      g = value;
      b = value;
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  return imageData;
}

/* # 3. 전처리 실행 */
export async function preprocessImageFile(
  file: File,
  options: OcrPreprocessOptions = DEFAULT_OCR_PREPROCESS_OPTIONS
): Promise<File> {
  const { canvas, ctx } = await loadImageToCanvas(file);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processed = processPixels(imageData, options);

  ctx.putImageData(processed, 0, 0);

  // # 3-1. 약간의 기울기 보정 힌트
  // 실제 자동 deskew 알고리즘은 아니지만, OCR 전처리 모드 표시용으로 구조를 남김
  if (options.deskewHint) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0)";
    ctx.restore();
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.95)
  );

  if (!blob) {
    throw new Error("이미지 전처리에 실패했습니다.");
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-ocr.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/* # 4. 미리보기 URL 생성 */
export async function buildPreprocessedPreviewUrl(
  file: File,
  options: OcrPreprocessOptions = DEFAULT_OCR_PREPROCESS_OPTIONS
) {
  const processedFile = await preprocessImageFile(file, options);
  return {
    processedFile,
    previewUrl: URL.createObjectURL(processedFile),
  };
}