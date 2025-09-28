const { initializeApp, cert } = require("firebase-admin/app");

const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("./serviceAccountKey.json");
console.log("✅ Firebase Admin initialized with project:", serviceAccount.project_id);
// Khởi tạo Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount),
  projectId: "subasa-sports", // ép projectId
});

const db = getFirestore();
const auth = getAuth();

async function cleanupChats() {
  console.log("=== [Cleanup] Bắt đầu xóa chats guest (email=null) ===");

  const snapshot = await db
    .collection("chats")
    .where("email", "==", null)
    .get();

  if (snapshot.empty) {
    console.log("[Cleanup] Không có chat guest để xóa");
    return;
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log("🗑️ Xóa chat:", doc.id);

    // Xóa messages con
    const messagesRef = db.collection("chats").doc(doc.id).collection("messages");
    const messagesSnap = await messagesRef.get();
    for (const msg of messagesSnap.docs) {
      await msg.ref.delete();
    }

    // Xóa document chính
    await doc.ref.delete();

    // Nếu có userId → xóa luôn Auth user
    if (data.userId) {
      try {
        await auth.deleteUser(data.userId);
        console.log(`✅ Đã xóa Auth user: ${data.userId}`);
      } catch (err) {
        console.error(`❌ Lỗi khi xóa user ${data.userId}:`, err.message);
      }
    }
  }

  console.log("=== [Cleanup] Hoàn tất xóa chats guest ===");
}

async function cleanupAnonymousUsers() {
  console.log("=== [Cleanup] Bắt đầu xóa anonymous users còn sót ===");

  let nextPageToken;
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const deletions = [];

    listUsersResult.users.forEach((userRecord) => {
      if (userRecord.providerData.length === 0) { // anonymous user
        console.log(`🗑️ Xóa anonymous user: ${userRecord.uid}`);
        deletions.push(auth.deleteUser(userRecord.uid));
      }
    });

    // Chạy xóa song song
    const results = await Promise.allSettled(deletions);
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        console.log("✅ Đã xóa anonymous user");
      } else {
        console.error("❌ Lỗi khi xóa anonymous:", r.reason);
      }
    });

    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  console.log("=== [Cleanup] Hoàn tất xóa anonymous users ===");
}

async function cleanupGuests() {
  await cleanupChats();            // Bước 1: Xóa chats guest
  await cleanupAnonymousUsers();   // Bước 2: Xóa các anonymous users sót lại
  console.log("=== [Cleanup] TOÀN BỘ HOÀN TẤT ===");
}

cleanupGuests().then(() => process.exit(0));
