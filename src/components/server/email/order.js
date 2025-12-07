import express from "express";
import { transporter } from "./mailer.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const router = express.Router();

// ======= TẠO PDF UNICODE =======
function generateInvoicePDF(orderId, customerName, items, total, address, phone) {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(process.cwd(), `invoice_${orderId}.pdf`);
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

<<<<<<< HEAD
    const fontRegular = path.join(process.cwd(), "font", "NotoSans-Regular.ttf");
=======
    const fontRegular = path.join(process.cwd(),"font", "NotoSans-Regular.ttf");
>>>>>>> 402659de7eb0d7d61b8ab105c1c71cd20a11c67b
    doc.font(fontRegular);

    /* ===========================
        HEADER + LOGO
    ============================ */
    const logoPath = path.join(process.cwd(), "font", "Logo.png");
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 30, 25, { width: 120 });
    }

    // TIÊU ĐỀ CĂN GIỮA
    doc.fontSize(24).text("HÓA ĐƠN MUA HÀNG", {
      align: "center",
    });

    doc.moveDown(2);

    /* ===========================
        THÔNG TIN ĐƠN HÀNG (cách trái 20px)
    ============================ */
    const leftPadding = 60;

    doc.fontSize(12);
    doc.text(`Mã đơn hàng: ${orderId}`, leftPadding);
    doc.text(`Khách hàng: ${customerName}`, leftPadding);
    doc.text(`Số điện thoại: ${phone}`, leftPadding);
    doc.text(`Địa chỉ: ${address}`, leftPadding);
    doc.moveDown(1);

    // ĐƯỜNG KẺ
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

    /* ===========================
        BẢNG SẢN PHẨM
    ============================ */
    doc.moveDown(1.5);
    doc.fontSize(14).text("Chi tiết sản phẩm", leftPadding, doc.y, { underline: true });
    doc.moveDown(0.5);

    let tableTop = doc.y;

    // Header bảng
    doc.fontSize(12).text("Sản phẩm", leftPadding, tableTop);
    doc.text("SL", 300, tableTop, { width: 40, align: "right" });
    doc.text("Đơn giá", 360, tableTop, { width: 80, align: "right" });
    doc.text("Thành tiền", 460, tableTop, { width: 100, align: "right" });

    // Gạch dưới header
    doc.moveTo(leftPadding, tableTop + 18).lineTo(555, tableTop + 18).stroke();

    let y = tableTop + 25;

    items.forEach((i) => {
      const lineTotal = i.quantity * i.product.salePrice;

      doc.text(i.product.productName, leftPadding, y, { width: 220 });
      doc.text(i.quantity.toString(), 300, y, { width: 40, align: "right" });
      doc.text(Number(i.product.salePrice).toLocaleString() + "đ", 360, y, {
        width: 80,
        align: "right",
      });
      doc.text(lineTotal.toLocaleString() + "đ", 460, y, {
        width: 100,
        align: "right",
      });

      y += 22;
    });

    // Line dưới bảng
    doc.moveTo(leftPadding, y + 5).lineTo(555, y + 5).stroke();

    doc.moveDown(2);

    /* ===========================
        TỔNG TIỀN
    ============================ */
    doc.fontSize(14).text(`Tổng cộng: ${total.toLocaleString()}đ`, {
      align: "right",
    });

    /* ===========================
        FOOTER + LOGO 2
    ============================ */

    const pageHeight = doc.page.height;
    const footerY = pageHeight - 120;  // luôn cách cuối trang một khoảng đẹp

    // Thêm Logo2 (bên PHẢI)
    const logo2Path = path.join(process.cwd(), "font", "Logo2.png");
    if (fs.existsSync(logo2Path)) {
      doc.image(logo2Path, 390, footerY - 20, { width: 140 });
    }

    doc.fontSize(11).fillColor("#555");

    doc.text("Cảm ơn bạn đã mua hàng tại Subasa Shop!", 40, footerY, {
      align: "left",
    });
    doc.text("Nếu có thắc mắc về đơn hàng, vui lòng liên hệ hỗ trợ.", {
      align: "left",
    });

    doc.end();

    stream.on("finish", () => resolve(pdfPath));
    stream.on("error", reject);
  });
}



// ======= API GỬI EMAIL =======
router.post("/send-email", async (req, res) => {
  try {
    const { email, customerName, orderId, items, total, address, phone } = req.body;

    if (!email) return res.status(400).json({ error: "Missing email" });

    const pdfPath = await generateInvoicePDF(orderId, customerName, items, total, address, phone);

    const itemListHtml = items
      .map(
        (i) => `
        <li>
          <strong>${i.product.productName}</strong> - 
          ${i.quantity} x ${Number(i.product.salePrice).toLocaleString()}đ
        </li>
      `
      )
      .join("");

    const mailOptions = {
      from: `"Subasa Shop" <subasasport@gmail.com>`,
      to: email,
      subject: `Order Confirmation #${orderId}`,
      html: `
        <h2>Xin chào ${customerName},</h2>
        <p>Cảm ơn bạn đã mua hàng!</p>
        <h3>Chi tiết đơn hàng:</h3>
        <ul>${itemListHtml}</ul>
        <p><strong>Tổng cộng:</strong> ${total.toLocaleString()}đ</p>
        <h3>Thông tin giao hàng</h3>
        <p>Địa chỉ: ${address}</p>
        <p>Số điện thoại: ${phone}</p>
        <p><strong>Hóa đơn PDF được đính kèm bên dưới.</strong></p>
      `,
      attachments: [
        {
          filename: `invoice_${orderId}.pdf`,
          path: pdfPath,
          contentType: "application/pdf",
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    // XÓA FILE
    setTimeout(() => {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    }, 1500);

    res.json({ message: "Email + PDF sent successfully" });

  } catch (err) {
    console.error("❌ Email error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;
