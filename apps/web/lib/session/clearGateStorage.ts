export function clearGateStorage() {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);

    if (!key) continue;

    if (
      key === 'gate_type' ||
      key === 'gate_access_id' ||
      key === 'gate_destination' ||
      key.startsWith('gate_passed_course_') ||
      key.startsWith('gate_passed_session_') ||
      key.startsWith('gate_passed_') // untuk key lama kamu
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    sessionStorage.removeItem(key);
  });
}