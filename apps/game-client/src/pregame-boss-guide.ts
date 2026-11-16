interface BossGuide {
  id: string;
  name: string;
  where: string;
  tip: string;
  moves: [skill: string, description: string][];
}

export const bossGuide: BossGuide[] = [
  {
    id: 'dong-ta',
    name: 'Đông Tà',
    where: 'Thủ thành · Sau đợt 5',
    tip: 'Khi Hoàng Dung xuất hiện, ưu tiên ngăn chưởng hồi máu. Giữ lối thoát khỏi Mai Siêu Phong và các cụm hoa.',
    moves: [
      [
        'ta_kiem_lien_kich',
        'Đâm liên tiếp theo hình quạt phía trước. Lách qua hông khi hướng đâm đã chốt.',
      ],
      [
        'lac_anh_normal',
        'Tung đòn hoa kiếm phía trước; bản chiêu lớn tạo bốn vệt chém theo dấu cộng và chữ X.',
      ],
      [
        'dan_chi_than_cong',
        'Bắn đạn thẳng tỏa ra mọi hướng. Di chuyển vào khe giữa các đường đạn.',
      ],
      ['ngoc_tieu_hoi_phong', 'Rải cụm hoa khắp sân rồi cho nổ lần lượt.'],
      [
        'trieu_hon_dong_hai',
        'Triệu hồi Mai Siêu Phong và Hoàng Dung khi máu xuống thấp.',
      ],
      ['bach_cot_trao', 'Mai Siêu Phong quào phía trước.'],
      ['ma_anh_troc_hon', 'Mai Siêu Phong bắn nhiều vệt trảo thẳng.'],
      ['am_phong_hap_luc', 'Mai Siêu Phong kéo người đang bị truy đuổi.'],
      ['doc_cot_bao', 'Mai Siêu Phong ném túi độc để lại vùng gây sát thương.'],
      [
        'thanh_am_ho_tro',
        'Hoàng Dung phóng chưởng hồi máu về phía đồng minh của boss.',
      ],
      ['linh_xa_bo', 'Hoàng Dung tăng tốc để đổi vị trí.'],
    ],
  },
  {
    id: 'tay-doc',
    name: 'Tây Độc',
    where: 'Thủ thành · Sau đợt 10',
    tip: 'Giữ đường thoát khỏi vùng độc. Đọc dấu báo trên mặt sân trước khi dùng Shift.',
    moves: [
      ['tay_doc_staff', 'Quét trượng cận chiến.'],
      ['tay_doc_gas', 'Bắn luồng độc khí bay thẳng.'],
      ['van_doc_phi_cham', 'Bắn nhiều phi châm từ xa theo các đường thẳng.'],
      ['doc_vu_me_hon', 'Đặt vùng sương độc lưu lại trên sân.'],
      ['co_doc_khoan_tam', 'Dùng cổ độc ở cự ly gần. Rời khu vực báo trước.'],
      [
        'hon_thien_phuc_long_chan',
        'Triển khai trận độc; di chuyển theo khoảng trống giữa các vùng cảnh báo.',
      ],
      ['cap_mo_cong', 'Chuyển sang thế cóc và đổi bộ chiêu.'],
      ['doc_chuong', 'Phóng chưởng độc tầm xa.'],
      ['cap_mo_chan_kich', 'Chấn kích trên vùng lớn quanh điểm tiếp đất.'],
      ['ngu_doc_than_chuong', 'Tung thần chưởng độc trên nhiều hướng.'],
      ['van_doc_bao_phat', 'Phát tán các đường độc trong pha Cáp Mô.'],
    ],
  },
  {
    id: 'nam-de',
    name: 'Nam Đế',
    where: 'Thủ thành · Sau đợt 15',
    tip: 'Mang theo phương án hồi phục và giữ tay trên phím mũi tên để nhập chuỗi khi có yêu cầu.',
    moves: [
      ['nam_de_palm', 'Đánh chưởng kèm sóng xung kích.'],
      ['nam_de_aura', 'Phát Phật Quang quanh thân.'],
      ['nam_de_small_finger', 'Bắn chỉ lực tầm xa.'],
      ['nhat_duong_chi', 'Bắn chỉ lực theo hướng đã chốt; né ngang đường bắn.'],
      [
        'lien_hoan_nhat_duong_chi',
        'Bắn liên tiếp nhiều lần. Đợi loạt bắn dứt hẳn trước khi quay lại.',
      ],
      [
        'dai_ly_phong_huyet',
        'Phong huyệt giữ một người tại chỗ. Bấm chuỗi mũi tên vật lý theo thứ tự hiện trên màn hình.',
      ],
      ['phat_quang_pho_chieu', 'Phật quang phủ khu vực giao chiến theo đợt.'],
      [
        'nhat_duong_quy_tong',
        'Tuyệt chiêu Nhất Dương đánh diện rộng. Rời vùng báo trước.',
      ],
      ['nam_de_dash', 'Lướt ra sau để tạo khoảng cách.'],
    ],
  },
  {
    id: 'bac-cai',
    name: 'Bắc Cái',
    where: 'Thủ thành · Sau đợt 20',
    tip: 'Tách nhau khi có dây nối. Theo dõi con thật qua các lượt phân thân và chừa đường tránh rồng.',
    moves: [
      ['Đả Cẩu Bổng Pháp', 'Quét phía trước rồi lao theo hướng đã chốt.'],
      ['Hàng Long 18 Chưởng', 'Phóng đầu rồng bay thẳng.'],
      ['bc_beam', 'Phát luồng bổng kích dài theo vệt báo trước.'],
      ['bc_dogs', 'Gọi bốn chó tấn công mỗi lần thi triển.'],
      ['bc_clones', 'Phân thân, đảo vị trí qua nhiều lượt.'],
      ['bc_vortex', 'Hút cả sân về tâm rồi giáng đòn gây choáng.'],
      [
        'bc_tether',
        'Nối hai người chơi sau khi kéo họ lại; chỉ xuất hiện khi có đủ mục tiêu.',
      ],
      ['bc_field', 'Nhảy giáng xuống và để lại bãi đánh hình chữ điền.'],
      ['bc_spiral', 'Thả rồng xoắn ốc quanh tâm cố định.'],
    ],
  },
  {
    id: 'ly-mac-sau',
    name: 'Lý Mạc Sầu',
    where: 'Phó bản · Cổ Mộ',
    tip: 'Né ngang hướng ngân châm. Khi có cảnh báo từ rìa sân, tìm khe giữa các luồng chưởng đi vào.',
    moves: [
      ['ly_mac_sau_basic', 'Đánh phất trần ở tầm gần.'],
      [
        'bang_phach_ngan_cham',
        'Bắn một kim thẳng theo vị trí mục tiêu lúc xuất chiêu.',
      ],
      ['xich_luyen_chuong', 'Đồng loạt phóng chưởng theo tám hướng cố định.'],
      ['phat_tran_cong', 'Quét hình nón phía trước và làm choáng.'],
      ['co_mo_kiem_phap', 'Gọi các kiếm sĩ Cổ Mộ truy đuổi người chơi.'],
      [
        'ngu_doc_chuong',
        'Phóng chưởng từ bốn rìa hướng vào sân, làm chậm người bị trúng.',
      ],
    ],
  },
  {
    id: 'hong-liet',
    name: 'Hoàn Nhan Hồng Liệt',
    where: 'Phó bản · Hoàn Nhan Hồng Liệt',
    tip: 'Vệt dung nham, thiên thạch và núi lửa đều có thể làm choáng. Giữ Shift để rời vùng báo.',
    moves: [
      ['hong_liet_a1', 'Bắn đao khí xòe thành năm đường.'],
      ['hong_liet_a2', 'Quét đại đao phía trước và làm choáng.'],
      ['dung_nham_liet_dia', 'Giáng đòn dung nham lên khu vực đánh dấu.'],
      ['hoa_son_bao_phat', 'Gọi núi lửa gây sát thương, chậm và bỏng.'],
      ['liet_diem_phong_toa', 'Lướt và phong tỏa lối đi bằng vệt lửa.'],
      ['hoa_tien_te_phat', 'Gọi loạt hỏa tiễn; tránh vị trí bị nhắm.'],
      ['thiet_ky_trieu_binh', 'Triệu quân tiếp viện có thể bị hạ.'],
      ['van_ly_nham_hoa', 'Dồn nhiều đợt thiên thạch xuống sân.'],
      ['hoa_phao_thien_la', 'Bắn pháo theo các hàng và cột đánh dấu.'],
    ],
  },
  {
    id: 'chu-ba-thong',
    name: 'Chu Bá Thông',
    where: 'Phó bản · Chu Bá Thông',
    tip: 'Ngừng gây sát thương khi boss phản chấn. Khi đồng đội bị nhốt, những người còn lại hãy tập trung vào vòng trận.',
    moves: [
      [
        'Quyền trái/phải',
        'Đấm theo luồng thẳng phía trước; chưởng thường bay theo vị trí đã chọn.',
      ],
      ['hands', 'Bốn chưởng lớn quét qua sân và làm chậm khi trúng.'],
      [
        'trap',
        'Nhốt một người trong vòng, giải khi các đồng đội cần thiết vào vòng.',
      ],
      ['spin', 'Lao nhanh khắp sân, gây sát thương lúc chạm.'],
      [
        'reflect',
        'Hút, làm chậm và khóa Shift; phản lại sát thương thực boss nhận.',
      ],
      ['ultimate', 'Thả vùng nhỏ di động và các vành sóng nở rộng.'],
      ['drink', 'Tiểu đồng chạy vào dâng rượu.'],
    ],
  },
  {
    id: 'kim-luan',
    name: 'Kim Luân Pháp Vương',
    where: 'Phó bản · Tương Dương',
    tip: 'Vượt qua Hoắc Đô và Đạt Nhĩ Ba trước. Khi đàn voi xuất hiện, vào vùng trú sau đá và chuẩn bị di chuyển ngay khi đàn voi qua.',
    moves: [
      ['thiet_phien_lien_hoan', 'Hoắc Đô quạt liên hoàn, làm chậm.'],
      ['cuong_phong_tan_loi_cong', 'Hoắc Đô tung đòn gió mạnh, làm chậm.'],
      ['phien_trung_doc_dinh', 'Hoắc Đô bắn đinh tẩm độc, làm chậm.'],
      ['cuong_phong_van_nhan', 'Hoắc Đô thả loạt lưỡi gió, làm chậm.'],
      ['dat_sweep', 'Đạt Nhĩ Ba quét chùy và làm choáng.'],
      [
        'dai_luc_pha_son',
        'Đạt Nhĩ Ba giáng đòn mạnh hoặc ném đá, làm choáng khi trúng.',
      ],
      ['bat_dong_kim_cang', 'Đạt Nhĩ Ba thủ thế.'],
      ['hang_ma_tam_lien_chan', 'Đạt Nhĩ Ba đánh ba đợt chấn động gây choáng.'],
      ['kim_sweep', 'Kim Luân đánh quét tầm gần.'],
      ['kim_hand_chop', 'Chém đao khí bán nguyệt phía trước.'],
      ['kim_luan_truy_hon', 'Phóng kim luân; tránh đường bay đã báo.'],
      ['ngu_luan_ho_the', 'Triển khai vòng luân quanh thân.'],
      ['ngu_luan_phong_toa', 'Rải luân phong tỏa khu vực di chuyển.'],
      ['long_tuong_chan_thien', 'Giáng chấn động diện rộng.'],
      [
        'long_tuong_bat_nha_cong',
        'Gọi đàn voi, gây choáng nếu trúng. Dùng đá trú ẩn.',
      ],
      [
        'long_tuong_bat_nha_thap_tang',
        'Đợt đàn voi ở tầng mười; tìm chỗ trú ngay khi có cảnh báo.',
      ],
    ],
  },
  {
    id: 'vuong',
    name: 'Vương Trùng Dương',
    where: 'Thủ thành · Trận cuối',
    tip: 'Quan sát dấu báo vòng trong/vòng ngoài, đọc trước thứ tự ấn và nhập chuỗi mũi tên khi bị kéo vào tâm.',
    moves: [
      [
        'vtd_nhat_khi_hoa_tam_thanh',
        'Tung loạt Tam Thanh; tránh các hướng đòn xuất hiện.',
      ],
      [
        'vtd_cuu_am_ho_the',
        'Dựng hộ thể giảm sát thương. Chờ thời điểm sơ hở để dồn đòn.',
      ],
      [
        'vtd_toan_chan_phan_kiem',
        'Kéo người chơi về tâm và yêu cầu nhập chuỗi mũi tên.',
      ],
      [
        'vtd_ngu_hanh_kiem_tran',
        'Triển khai kiếm trận theo một trong năm thế. Đọc vùng cảnh báo của thế hiện tại.',
      ],
      ['vtd_bac_dau_kiem_tran', 'Lập kiếm trận Bắc Đẩu từ giữa sân.'],
      ['vtd_tam_thanh_pha_tran', 'Giáng đòn phá trận theo khu vực báo trước.'],
      [
        'vtd_tien_thien_chan_mach',
        'Chấn kích vòng trong hoặc vòng ngoài. Chuyển sang vùng an toàn.',
      ],
      [
        'vtd_huyen_vu_kiem_tran',
        'Gọi ba kiếm trận và bào mòn sinh lực theo thời gian.',
      ],
      [
        'vtd_nhat_duong_chi',
        'Tấn công bằng chỉ lực khi kiếm trận đang hoạt động.',
      ],
      ['vtd_pha_the_vo_hinh_kiem', 'Kiếm rơi theo điểm báo trên sân.'],
      [
        'vtd_that_tuyet_loi_am',
        'Ghi nhớ thứ tự ấn và di chuyển vào đúng ấn theo từng nhịp. Thất bại khiến cả đội thua lượt đấu.',
      ],
    ],
  },
];
