import express from "express";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const router = express.Router();

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
const productsRef = db.collection("products");
const categoryRef = db.collection("category");

// =================== PRODUCTS API ===================

// Lấy tất cả sản phẩm
router.get("/", async (req, res) => {
  try {
    const snap = await productsRef.get();
    const products = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi lấy sản phẩm",
      error: err.message,
    });
  }
});

// Lấy sản phẩm theo ID
router.get("/:id", async (req, res) => {
  try {
    const docSnap = await productsRef.doc(req.params.id).get();
    if (!docSnap.exists)
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.status(200).json({ id: docSnap.id, ...docSnap.data() });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi lấy sản phẩm",
      error: err.message,
    });
  }
});

// Tạo sản phẩm
router.post("/", async (req, res) => {
  try {
    const newDoc = await productsRef.add(req.body);
    res.status(201).json({ id: newDoc.id, ...req.body });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi tạo sản phẩm",
      error: err.message,
    });
  }
});

// Cập nhật sản phẩm
router.put("/:id", async (req, res) => {
  try {
    await productsRef.doc(req.params.id).update(req.body);
    res.status(200).json({ message: "Cập nhật sản phẩm thành công" });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi cập nhật sản phẩm",
      error: err.message,
    });
  }
});

// Xóa sản phẩm
router.delete("/:id", async (req, res) => {
  try {
    await productsRef.doc(req.params.id).delete();
    res.status(200).json({ message: "Xóa sản phẩm thành công" });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi khi xóa sản phẩm",
      error: err.message,
    });
  }
});

export default router;
