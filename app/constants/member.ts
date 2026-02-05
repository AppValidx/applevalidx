import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_MEMBER = "validx_member_id";
const KEY_PAID = "validx_paid";

// ✅ Para ti ya existe "0001" guardado, así que no se toca.
// Para nuevos: generamos un ID BLACK (0051 - 9999)
function generateBlackId() {
  const n = Math.floor(Math.random() * (9999 - 51 + 1)) + 51; // 51..9999
  return String(n).padStart(4, "0");
}

export async function getOrCreateMemberId() {
  const existing = await AsyncStorage.getItem(KEY_MEMBER);
  if (existing) return existing;

  const id = generateBlackId();
  await AsyncStorage.setItem(KEY_MEMBER, id);
  return id;
}

export async function isPaid() {
  const v = await AsyncStorage.getItem(KEY_PAID);
  return v === "true";
}

export async function setPaid(value: boolean) {
  await AsyncStorage.setItem(KEY_PAID, value ? "true" : "false");
}

// Se usa en Paywall: marca pagado y garantiza memberId
export async function ensurePaidAndMember() {
  await setPaid(true);
  await getOrCreateMemberId();
}
