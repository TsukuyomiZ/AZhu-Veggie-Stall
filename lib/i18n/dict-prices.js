// 價目表領域字典:價目列表、新增/編輯表單、批次匯入
// 佔位變數:{name} 品項名、{n} 數量、{i}/{total} 進度、{ok}/{skip} 匯入結果
const dictPrices = {
  zh: {
    "prices.title": "價目表",
    "prices.entry": "價目表",
    "prices.addNew": "+ 新增品項",
    "prices.batchImport": "批次匯入(貼上價目表)",
    "prices.loadError": "載入價目表失敗,請稍後再試",

    // 表單
    "prices.name": "品項名",
    "prices.unit": "單位",
    "prices.price": "單價",
    "prices.unitPlaceholder": "例:斤、把、袋",
    "prices.nameRequired": "請輸入品項名",
    "prices.priceRequired": "請輸入單價",
    "prices.saveFailed": "儲存失敗,請稍後再試",
    "prices.saving": "儲存中…",

    // 刪除
    "prices.deleteConfirm": "確定要刪除 {name} 嗎?",
    "prices.deleteFailed": "刪除失敗,請稍後再試",

    // 空狀態
    "prices.emptyText": "還沒有價目,先新增一項吧",
    "prices.emptyHint": "也可以用下方「批次匯入」一次貼上整份價目表",

    // 批次匯入
    "prices.importLabel": "貼上價目表(一行一項:品項名 單位 價錢,用空格分開)",
    "prices.importPlaceholder": "高麗菜 50\n空心菜 斤 35\n青蔥,80元",
    "prices.parsePreview": "解析預覽",
    "prices.importParsed": "解析出 {n} 筆",
    "prices.importParsedSkip": ",其中 {n} 筆會跳過",
    "prices.existsBadge": "已存在",
    "prices.invalidBadge": "無法辨識",
    "prices.backEdit": "返回修改",
    "prices.importing": "匯入中…",
    "prices.importProgress": "匯入中… {i}/{total}",
    "prices.confirmImport": "確認匯入 {n} 筆",
    "prices.importDone": "匯入完成:成功 {ok} 筆、跳過 {skip} 筆",
  },
  vi: {
    "prices.title": "Bảng giá",
    "prices.entry": "Bảng giá",
    "prices.addNew": "+ Thêm món",
    "prices.batchImport": "Nhập nhiều món (dán bảng giá)",
    "prices.loadError": "Tải bảng giá không được, lát thử lại nhé",

    // 表單
    "prices.name": "Tên món",
    "prices.unit": "Đơn vị",
    "prices.price": "Đơn giá",
    // 單位是資料(中文),範例照原樣給中文
    "prices.unitPlaceholder": "VD: 斤、把、袋",
    "prices.nameRequired": "Nhập tên món trước nhé",
    "prices.priceRequired": "Nhập đơn giá trước nhé",
    "prices.saveFailed": "Lưu không được, lát thử lại nhé",
    "prices.saving": "Đang lưu…",

    // 刪除
    "prices.deleteConfirm": "Chắc chắn muốn xoá {name} không?",
    "prices.deleteFailed": "Xoá không được, lát thử lại nhé",

    // 空狀態
    "prices.emptyText": "Chưa có giá nào, thêm một món trước nhé",
    "prices.emptyHint": "Cũng có thể dán cả bảng giá bằng nút “Nhập nhiều món” bên dưới",

    // 批次匯入
    "prices.importLabel": "Dán bảng giá (mỗi dòng một món: tên món, đơn vị, giá, cách nhau bằng dấu cách)",
    // 範例保留中文品項 —— 價目表本來就是中文資料,照原樣貼才對得上
    "prices.importPlaceholder": "高麗菜 50\n空心菜 斤 35\n青蔥,80元",
    "prices.parsePreview": "Xem trước",
    "prices.importParsed": "Nhận ra {n} món",
    "prices.importParsedSkip": ", trong đó {n} món sẽ bỏ qua",
    "prices.existsBadge": "Đã có rồi",
    "prices.invalidBadge": "Không nhận ra",
    "prices.backEdit": "Quay lại sửa",
    "prices.importing": "Đang nhập…",
    "prices.importProgress": "Đang nhập… {i}/{total}",
    "prices.confirmImport": "Nhập {n} món",
    "prices.importDone": "Nhập xong: thành công {ok} món, bỏ qua {skip} món",
  },
};

export default dictPrices;
