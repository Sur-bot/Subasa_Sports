// cleanup-guests.js
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json"); 

// Khởi tạo Firebase Admin SDK với service account
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function cleanupGuests() {
  const now = Date.now();
  console.log("[Cleanup] Bắt đầu xóa guest cũ, thời gian:", new Date(now).toISOString());

  // Query các chats guest có expireAt <= hiện tại
  const snapshot = await db
    .collection("chats")
    .where("isGuest", "==", true)
    .where("expireAt", "<=", now)
    .get();

  if (snapshot.empty) {
    console.log("[Cleanup] Không có guest hết hạn");
    return;
  }

  for (const doc of snapshot.docs) {
    console.log("[Cleanup] Xóa chat:", doc.id);

    // Xóa messages con trước
    const messagesRef = db.collection("chats").doc(doc.id).collection("messages");
    const messagesSnap = await messagesRef.get();
    for (const msg of messagesSnap.docs) {
      await msg.ref.delete();
    }

    // Xóa document chính
    await doc.ref.delete();
  }

  console.log("[Cleanup] Hoàn tất");
}

cleanupGuests().then(() => process.exit(0));
