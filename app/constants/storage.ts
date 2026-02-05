import AsyncStorage from "@react-native-async-storage/async-storage";

export const KEYS = {
  ACCESS_GRANTED: "validx.accessGranted.v1",
  ACCESS_CODE: "validx.accessCode.v1",

  PROFILE_NAME: "validx.profileName.v1",
  PROFILE_PHOTO: "validx.profilePhotoUri.v1",

  MEMBER_ID: "validx_member_id",
  PAID: "validx_paid",

  BURN_CODES: "validx.burnCodes.v1",
};

const OWNER_CODE = "ADRX";

// ✅ borra identidad local.
// - default: borra todo (para que el siguiente sea nuevo)
// - keepOwner=true: si el último código fue ADRX, preserva founder identity
export async function wipeIdentity(options?: {
  keepBurnCodes?: boolean;
  keepOwner?: boolean;
}) {
  const keepBurnCodes = options?.keepBurnCodes ?? true;
  const keepOwner = options?.keepOwner ?? true;

  const lastCode = await AsyncStorage.getItem(KEYS.ACCESS_CODE);
  const isOwner = lastCode === OWNER_CODE;

  // Siempre removemos sesión (logout)
  const keysToRemove: string[] = [KEYS.ACCESS_GRANTED];

  // Si queremos preservar Owner y el device está en Owner
  if (keepOwner && isOwner) {
    // ✅ no borra memberId, paid, nombre, foto, etc.
    // solo quita sesión para que te pida code otra vez
    // (y dejamos ACCESS_CODE para que siga founder)
    await AsyncStorage.multiRemove(keysToRemove);
    return;
  }

  // ✅ wipe completo (para “nuevo usuario”)
  keysToRemove.push(
    KEYS.ACCESS_CODE,
    KEYS.PROFILE_NAME,
    KEYS.PROFILE_PHOTO,
    KEYS.MEMBER_ID,
    KEYS.PAID
  );

  if (!keepBurnCodes) keysToRemove.push(KEYS.BURN_CODES);

  await AsyncStorage.multiRemove(keysToRemove);
}
