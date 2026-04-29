export const DAILY_BASE_REWARD = 200;
export const FRIDAY_REWARD = 400;
export const SATURDAY_REWARD = 1000;
export const SIMILAR_PROBLEM_COST = 200;

export type RewardType = "daily" | "friday_double" | "saturday_weekly";

type DailyRewardInfo = {
  amount: number;
  rewardType: RewardType;
  label: string;
};

const KST_TIME_ZONE = "Asia/Seoul";

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const KST_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: KST_TIME_ZONE,
  weekday: "short",
});

const WEEKDAY_INDEX_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getKstDateString(date: Date = new Date()) {
  const parts = KST_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getKstWeekday(date: Date = new Date()) {
  const weekday = KST_WEEKDAY_FORMATTER.format(date);
  return WEEKDAY_INDEX_MAP[weekday] ?? 0;
}

export function getRewardLabel(rewardType: RewardType) {
  switch (rewardType) {
    case "friday_double":
      return "금요일 2배 리워드";
    case "saturday_weekly":
      return "토요일 2배 + 주간 리워드";
    default:
      return "오늘의 리워드";
  }
}

export function getDailyRewardByKstDate(date: Date = new Date()): DailyRewardInfo {
  const weekday = getKstWeekday(date);

  if (weekday === 5) {
    return {
      amount: FRIDAY_REWARD,
      rewardType: "friday_double",
      label: getRewardLabel("friday_double"),
    };
  }

  if (weekday === 6) {
    return {
      amount: SATURDAY_REWARD,
      rewardType: "saturday_weekly",
      label: getRewardLabel("saturday_weekly"),
    };
  }

  return {
    amount: DAILY_BASE_REWARD,
    rewardType: "daily",
    label: getRewardLabel("daily"),
  };
}

export function canAffordSimilarProblem(credits: number) {
  return credits >= SIMILAR_PROBLEM_COST;
}

export function canGenerateSimilarProblem(credits: number) {
  return canAffordSimilarProblem(credits);
}
