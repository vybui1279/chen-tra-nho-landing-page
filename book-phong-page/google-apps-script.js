/**
 * ================================================================
 * Le'Monet Art Café — Google Apps Script v2
 * Webhook flow: Booking → Sheet → Sepay webhook → Sheet update
 * ================================================================
 *
 * HƯỚNG DẪN SAU KHI UPDATE CODE NÀY:
 * 1. Vào Apps Script → Deploy → Manage deployments
 * 2. Bấm ✏️ Edit trên deployment hiện tại
 * 3. Version → chọn "New version"
 * 4. Bấm Deploy → URL giữ nguyên ✅
 *
 * CẤU HÌNH SEPAY WEBHOOK:
 * 1. Vào my.sepay.vn → Cài đặt → Webhook
 * 2. URL: [URL Apps Script của bạn]
 * 3. Bật webhook → Save
 *
 * CẤU HÌNH TELEGRAM BOT (Tùy chọn):
 * 1. Điền TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID bên dưới.
 * ================================================================
 */

const SHEET_NAME   = 'Đặt Cọc';
const DEPOSIT_AMOUNT = 100000; // VNĐ — số tiền cọc tối thiểu

// Thay bằng Token và Chat ID của bạn (nếu muốn nhận thông báo Telegram)
const TELEGRAM_BOT_TOKEN = '8841224502:AAGsjzofHIjG8bAFLBf-DDHBQK5mppSRboE'; // VD: '123456789:ABCDefghIJKlmnop...'
const TELEGRAM_CHAT_ID   = '8842929764'; // VD: '123456789' hoặc '-100123456789'

// ── doPost: nhận 2 loại request ──────────────────────────────
function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    // Phân biệt booking mới vs Sepay webhook
    if (data.type === 'booking') {
      return handleBooking(data);
    } else {
      return handleSePayWebhook(data);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── doGet: frontend poll ?ref=ORDERREF ───────────────────────
function doGet(e) {
  const ref = e.parameter && e.parameter.ref;
  if (!ref) {
    return jsonResponse({ status: 'ok', service: "Le'Monet Booking Sheet v2" });
  }

  const sheet = getOrCreateSheet();
  const data  = sheet.getDataRange().getValues();

  // Tìm hàng có mã đặt chỗ = ref (cột B = index 1)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toUpperCase() === ref.trim().toUpperCase()) {
      const status = String(data[i][11]); // cột L = Trạng thái
      const paid   = status.includes('✅');
      return jsonResponse({
        paid,
        ref,
        status,
        name:  data[i][2],
        date:  data[i][4],
        time:  data[i][5],
        room:  data[i][6],
        pkg:   data[i][7],
      });
    }
  }

  // Chưa tìm thấy ref này
  return jsonResponse({ paid: false, ref, status: 'not_found' });
}

// ── Ghi booking mới vào Sheet ────────────────────────────────
function handleBooking(data) {
  const sheet = getOrCreateSheet();

  // Tạo header nếu chưa có
  if (sheet.getLastRow() === 0) {
    const header = [
      'Thời gian đăng ký', 'Mã đặt chỗ', 'Tên', 'Điện thoại',
      'Ngày thuê', 'Giờ bắt đầu', 'Phòng', 'Gói',
      'Số tiền cọc', 'Mã GD Sepay', 'Thời gian GD', 'Trạng thái'
    ];
    sheet.appendRow(header);
    const hr = sheet.getRange(1, 1, 1, 12);
    hr.setFontWeight('bold');
    hr.setBackground('#1A3A4A');
    hr.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // Kiểm tra ref đã tồn tại chưa (tránh duplicate)
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (String(existing[i][1]).trim() === String(data.ref).trim()) {
      return jsonResponse({ success: true, duplicate: true });
    }
  }

  sheet.appendRow([
    new Date(),
    data.ref   || '',
    data.name  || '',
    data.phone || '',
    data.date  || '',
    data.time  || '',
    data.room  || '',
    data.pkg   || '',
    DEPOSIT_AMOUNT,
    '', // Mã GD Sepay — chờ webhook
    '', // Thời gian GD — chờ webhook
    'Chờ thanh toán ⏳'
  ]);

  sheet.autoResizeColumns(1, 12);
  return jsonResponse({ success: true });
}

// ── Xử lý webhook từ Sepay ───────────────────────────────────
function handleSePayWebhook(data) {
  // Sepay webhook payload fields:
  // data.id, data.transferAmount / data.amountIn,
  // data.description / data.transaction_content / data.content,
  // data.transactionDate / data.transaction_date

  const content = String(
    data.description || data.transaction_content || data.content || ''
  ).toUpperCase();

  const amount = parseFloat(
    data.transferAmount || data.amountIn || data.amount_in || 0
  );

  // Không đủ số tiền → bỏ qua
  if (amount < DEPOSIT_AMOUNT) {
    return jsonResponse({ success: false, reason: 'amount_insufficient' });
  }

  const sheet = getOrCreateSheet();
  const rows  = sheet.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < rows.length; i++) {
    const ref = String(rows[i][1]).trim().toUpperCase();
    if (ref && content.includes(ref)) {
      // ── Chống gửi trùng: nếu đã thanh toán rồi thì bỏ qua ──
      const currentStatus = String(rows[i][11]);
      if (currentStatus.includes('✅')) {
        return jsonResponse({ success: true, updated: false, reason: 'already_paid' });
      }

      // Tìm thấy! Update hàng này
      const rowNum = i + 1;
      sheet.getRange(rowNum, 10).setValue(data.id || '');                         // Mã GD
      sheet.getRange(rowNum, 11).setValue(data.transactionDate || data.transaction_date || new Date()); // Thời gian GD
      sheet.getRange(rowNum, 12).setValue('Đã thanh toán ✅');                   // Trạng thái

      // Highlight hàng xanh
      sheet.getRange(rowNum, 1, 1, 12).setBackground('#d4edda');
      updated = true;

      // ── Gửi thông báo Telegram ──
      const name  = rows[i][2];
      const phone = rows[i][3];
      const date  = rows[i][4];
      const time  = rows[i][5];
      const room  = rows[i][6];
      const pkg   = rows[i][7];

      // Format ngày (nếu là Date object)
      const dateStr = date instanceof Date ? date.toLocaleDateString('vi-VN') : date;
      // Format giờ (nếu là Date object)
      const timeStr = time instanceof Date ? time.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : time;

      const msg = `🎉 <b>CÓ KHÁCH CỌC PHÒNG THÀNH CÔNG!</b>\n\n` +
                  `👤 Khách: ${name}\n` +
                  `📞 SĐT: ${phone}\n` +
                  `📅 Ngày: ${dateStr}\n` +
                  `⏰ Giờ: ${timeStr}\n` +
                  `🚪 Phòng: ${room} (${pkg})\n` +
                  `💰 Số tiền cọc: ${DEPOSIT_AMOUNT.toLocaleString('vi-VN')} VNĐ\n` +
                  `💳 Mã GD: ${data.id || ''}\n` +
                  `🔗 Trạng thái: Đã thanh toán ✅`;
      sendTelegramMessage(msg);

      break;
    }
  }

  return jsonResponse({ success: true, updated });
}

// ── Helpers ──────────────────────────────────────────────────
function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'HTML'
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error("Lỗi gửi Telegram: " + e.message);
  }
}

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── HÀM TEST (DÙNG ĐỂ CẤP QUYỀN) ──
function testTelegram() {
  sendTelegramMessage("✅ Bot Telegram đã được kết nối thành công với Google Apps Script!");
}
