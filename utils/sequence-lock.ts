/** 可锁定项接口（课程或课时） */
export interface LockableItem {
  documentId: string
  title: string
  sequenceNumber: number
  sequenceTag?: { documentId: string; name: string } | null
  enforceSequence: boolean
  isCompleted: boolean
}

/** 锁定判定结果 */
export interface LockResult {
  locked: boolean
  enforceMode: boolean   // true=硬锁, false=软提示
  reason: string         // 如「请先完成：Python基础」
  firstIncomplete?: LockableItem
}

/** quizRetryCount 枚举转数字 */
const RETRY_MAP: Record<string, number> = {
  no_retry: 0,
  retry_1: 1,
  retry_2: 2,
  retry_3: 3,
  retry_4: 4
};
function checkItemLock(target: LockableItem, allItems: LockableItem[]): LockResult {
  if (!target.sequenceTag || target.sequenceNumber === 0) {
    return { locked: false, enforceMode: false, reason: "" };
  }
  const prerequisites = allItems.filter(
    (item) => item.sequenceTag?.documentId === target.sequenceTag?.documentId && item.sequenceNumber > 0 && item.sequenceNumber < target.sequenceNumber
  );
  prerequisites.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const firstIncomplete = prerequisites.find((item) => !item.isCompleted);
  if (firstIncomplete) {
    return {
      locked: true,
      enforceMode: target.enforceSequence,
      reason: `\u8BF7\u5148\u5B8C\u6210\uFF1A${firstIncomplete.title}`,
      firstIncomplete
    };
  }
  return { locked: false, enforceMode: false, reason: "" };
}
function isCourseCompleted(lessons: Array<{ isCompleted: boolean; isRequired?: boolean }>): boolean {
  const requiredLessons = lessons.filter((l) => l.isRequired !== false);
  if (requiredLessons.length === 0)
    return true;
  return requiredLessons.every((l) => l.isCompleted);
}
function isQuizButtonLocked(
  allowRetakeQuiz: boolean,
  isPointsClaimed: boolean,
  earnedLessonIds: Set<string>,
  lessonDocumentId: string
): boolean {
  if (allowRetakeQuiz)
    return false;
  return isPointsClaimed || earnedLessonIds.has(lessonDocumentId);
}
export {
  RETRY_MAP,
  checkItemLock,
  isCourseCompleted,
  isQuizButtonLocked
};
