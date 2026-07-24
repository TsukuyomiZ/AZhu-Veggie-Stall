// 統計領域字典:銷量統計頁(週/月/季、摘要、圖表、排行)
// 佔位變數:{period} 期間名(本週/上月…先 t() 好再代入)、{n} 數字、
//          {y}{m}{d}{q} 年月日季、{w} 星期(weekday.* 先 t() 好)、
//          {detail}{money}{orders}{customers} 組句用
// 注意:中越日期寫法不同 —— 中文月/日(7/18)、越文日/月(18/7),
//       所以 shortDate / weekLabel 整句進字典,不在 JSX 拼字串。
const dictStats = {
  zh: {
    "stats.title": "銷量統計",

    // 期間切換
    "stats.week": "週",
    "stats.month": "月",
    "stats.quarter": "季",
    "stats.periodAria": "統計期間",
    "stats.thisWeek": "本週",
    "stats.lastWeek": "上週",
    "stats.thisMonth": "本月",
    "stats.lastMonth": "上月",
    "stats.thisQuarter": "本季",
    "stats.lastQuarter": "上一季",

    // 期間標題與日期格式
    "stats.weekLabel": "{m1}/{d1} – {m2}/{d2}",
    "stats.monthLabel": "{y} 年 {m} 月",
    "stats.quarterLabel": "{y} 年第 {q} 季({m1}–{m2} 月)",
    "stats.shortDate": "{m}/{d} ({w})",
    "stats.monthTick": "{n}月",
    "stats.monthDetail": "{n} 月",

    // 載入與空狀態
    "stats.loadError": "統計載入失敗,請檢查網路後再試一次",
    "stats.emptyText": "{period}還沒有訂單",
    "stats.emptyHint": "有訂單之後,這裡會顯示營收和品項統計",
    "stats.newOrder": "新增訂單",

    // 摘要卡
    "stats.revenueTitle": "{period}營收",
    "stats.summarySub": "{orders} 筆訂單 · {customers} 位客戶",

    // 與上期比較
    "stats.compareUp": "比{period}成長 {n}%",
    "stats.compareDown": "比{period}減少 {n}%",
    "stats.compareFlat": "與{period}持平",
    "stats.comparePrevEmpty": "{period}沒有訂單",

    // 重點列表
    "stats.lineOrders": "訂單",
    "stats.unitOrders": "筆",
    "stats.unitCustomers": "位客戶",
    "stats.lineTrend": "趨勢",
    "stats.lineTopItem": "賣最好",
    "stats.qtyPrefix": "共",
    "stats.lineBusiestDay": "最旺的一天",
    "stats.lineBusiestMonth": "最旺月份",

    // 長條圖
    "stats.chartTitleDaily": "每日營收",
    "stats.chartTitleMonthly": "每月營收",
    "stats.chartAria": "營收長條圖",
    "stats.chartHint": "點一下長條可以看當天的金額",
    "stats.chartDetail": "{detail}:{money} · {n} 筆訂單",

    // 排行
    "stats.itemRankTitle": "品項排行(依金額)",
    "stats.customerRankTitle": "客戶排行",
    "stats.noCustomer": "(未填客戶)",
    "stats.nOrders": "{n} 筆",
  },
  vi: {
    "stats.title": "Thống kê bán hàng",

    // 期間切換
    "stats.week": "Tuần",
    "stats.month": "Tháng",
    "stats.quarter": "Quý",
    "stats.periodAria": "Khoảng thời gian thống kê",
    "stats.thisWeek": "tuần này",
    "stats.lastWeek": "tuần trước",
    "stats.thisMonth": "tháng này",
    "stats.lastMonth": "tháng trước",
    "stats.thisQuarter": "quý này",
    "stats.lastQuarter": "quý trước",

    // 期間標題與日期格式(越文習慣 日/月)
    "stats.weekLabel": "{d1}/{m1} – {d2}/{m2}",
    "stats.monthLabel": "Tháng {m}/{y}",
    "stats.quarterLabel": "Quý {q}/{y} (tháng {m1}–{m2})",
    "stats.shortDate": "{d}/{m} ({w})",
    "stats.monthTick": "T{n}",
    "stats.monthDetail": "Tháng {n}",

    // 載入與空狀態
    "stats.loadError": "Tải thống kê không được, kiểm tra mạng rồi thử lại nhé",
    "stats.emptyText": "{period} chưa có đơn nào",
    "stats.emptyHint": "Khi có đơn hàng, ở đây sẽ hiện doanh thu và thống kê mặt hàng",
    "stats.newOrder": "Thêm đơn hàng",

    // 摘要卡
    "stats.revenueTitle": "Doanh thu {period}",
    "stats.summarySub": "{orders} đơn · {customers} khách",

    // 與上期比較
    "stats.compareUp": "Tăng {n}% so với {period}",
    "stats.compareDown": "Giảm {n}% so với {period}",
    "stats.compareFlat": "Ngang với {period}",
    "stats.comparePrevEmpty": "{period} không có đơn nào",

    // 重點列表
    "stats.lineOrders": "Đơn hàng",
    "stats.unitOrders": "đơn",
    "stats.unitCustomers": "khách",
    "stats.lineTrend": "Xu hướng",
    "stats.lineTopItem": "Bán chạy nhất",
    "stats.qtyPrefix": "tổng cộng",
    "stats.lineBusiestDay": "Ngày đắt hàng nhất",
    "stats.lineBusiestMonth": "Tháng đắt hàng nhất",

    // 長條圖
    "stats.chartTitleDaily": "Doanh thu từng ngày",
    "stats.chartTitleMonthly": "Doanh thu từng tháng",
    "stats.chartAria": "Biểu đồ cột doanh thu",
    "stats.chartHint": "Bấm vào cột để xem số tiền ngày đó",
    "stats.chartDetail": "{detail}: {money} · {n} đơn",

    // 排行
    "stats.itemRankTitle": "Xếp hạng mặt hàng (theo số tiền)",
    "stats.customerRankTitle": "Xếp hạng khách hàng",
    "stats.noCustomer": "(chưa chọn khách)",
    "stats.nOrders": "{n} đơn",
  },
};

export default dictStats;
