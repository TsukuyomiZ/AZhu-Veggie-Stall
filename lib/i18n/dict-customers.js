// 客戶領域字典:客戶列表、新增/編輯表單、批次匯入
// 佔位變數:{name} 客戶名、{n} 數量、{i}/{total} 進度、{names} 失敗名單
const dictCustomers = {
  zh: {
    "customers.title": "客戶",
    "customers.addNew": "+ 新增客戶",
    "customers.batchImport": "批次匯入(貼上名單)",
    "customers.loadError": "載入客戶資料失敗,請稍後再試",

    // 表單
    "customers.name": "姓名",
    "customers.phone": "電話",
    "customers.plate": "車牌",
    "customers.address": "地址",
    "customers.note": "備註",
    "customers.platePlaceholder": "例:ABC-1234",
    "customers.nameRequired": "請輸入姓名",
    "customers.saveFailed": "儲存失敗,請稍後再試",
    "customers.saving": "儲存中…",

    // 刪除
    "customers.deleteConfirm": "確定要刪除 {name} 嗎?",
    "customers.deleteFailed": "刪除失敗,請稍後再試",

    // 空狀態
    "customers.emptyText": "還沒有客戶,先新增一位吧",
    "customers.emptyHint": "按右上角「+ 新增客戶」開始",

    // 批次匯入
    "customers.importLabel": "貼上名單(一行一位:姓名 電話 車牌 地址,用空格分開)",
    "customers.importPlaceholder": "王媽媽 0912345678 ABC-1234\n李阿姨 0922333444 中山路10號\n陳老闆",
    "customers.parsePreview": "解析預覽",
    "customers.importParsed": "解析出 {n} 位",
    "customers.importParsedDup": ",其中 {n} 位已存在(會跳過)",
    "customers.onlyName": "只有姓名",
    "customers.existsBadge": "已存在",
    "customers.backEdit": "返回修改",
    "customers.importing": "匯入中…",
    "customers.importProgress": "匯入中… {i}/{total}",
    "customers.confirmImport": "確認匯入 {n} 位",
    "customers.importSuccess": "成功匯入 {n} 位",
    "customers.importFailedPart": ",失敗 {n} 位:{names}",
    "customers.nameSeparator": "、",
  },
  vi: {
    "customers.title": "Khách hàng",
    "customers.addNew": "+ Thêm khách",
    "customers.batchImport": "Nhập nhiều khách (dán danh sách)",
    "customers.loadError": "Tải danh sách khách không được, lát thử lại nhé",

    // 表單
    "customers.name": "Tên",
    "customers.phone": "Số điện thoại",
    "customers.plate": "Biển số xe",
    "customers.address": "Địa chỉ",
    "customers.note": "Ghi chú",
    "customers.platePlaceholder": "VD: ABC-1234",
    "customers.nameRequired": "Nhập tên trước nhé",
    "customers.saveFailed": "Lưu không được, lát thử lại nhé",
    "customers.saving": "Đang lưu…",

    // 刪除
    "customers.deleteConfirm": "Chắc chắn muốn xoá {name} không?",
    "customers.deleteFailed": "Xoá không được, lát thử lại nhé",

    // 空狀態
    "customers.emptyText": "Chưa có khách nào, thêm một người trước nhé",
    "customers.emptyHint": "Bấm nút “+ Thêm khách” ở góc trên để bắt đầu",

    // 批次匯入
    "customers.importLabel": "Dán danh sách (mỗi dòng một người: tên, SĐT, biển số, địa chỉ, cách nhau bằng dấu cách)",
    // 範例名單保留中文姓名 —— 客人本來就是台灣人,照原樣貼才對得上
    "customers.importPlaceholder": "王媽媽 0912345678 ABC-1234\n李阿姨 0922333444 中山路10號\n陳老闆",
    "customers.parsePreview": "Xem trước",
    "customers.importParsed": "Nhận ra {n} người",
    "customers.importParsedDup": ", trong đó {n} người đã có rồi (sẽ bỏ qua)",
    "customers.onlyName": "Chỉ có tên",
    "customers.existsBadge": "Đã có rồi",
    "customers.backEdit": "Quay lại sửa",
    "customers.importing": "Đang nhập…",
    "customers.importProgress": "Đang nhập… {i}/{total}",
    "customers.confirmImport": "Nhập {n} người",
    "customers.importSuccess": "Đã nhập xong {n} người",
    "customers.importFailedPart": ", thất bại {n} người: {names}",
    "customers.nameSeparator": ", ",
  },
};

export default dictCustomers;
