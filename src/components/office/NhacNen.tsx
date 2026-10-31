'use client';
/**
 * Nhạc nền: nhúng trình phát YouTube chính thức, phát lặp vô hạn.
 *
 * VÌ SAO NHÚNG CHỨ KHÔNG TẢI TỆP: tải nhạc từ YouTube về máy vi phạm điều khoản
 * của họ và thường xâm phạm bản quyền. Nhúng thì chạy đúng trình phát của
 * YouTube, quảng cáo vẫn chạy, tác giả vẫn được trả tiền.
 *
 * VÌ SAO KHÔNG DÙNG IFrame API: API đó nạp mã JavaScript của Google vào CHÍNH
 * trang này — trang đang hiển thị trạng thái máy chủ và dự án của bạn. Dùng thẻ
 * <iframe> trơn thì mã của YouTube nằm gọn trong khung riêng, khác nguồn gốc,
 * không với tới trang. Đổi lại: nút play/âm lượng là của YouTube, không phải
 * của tôi. Đánh đổi đó đáng.
 *
 * Dừng nhạc = gỡ hẳn <iframe> khỏi DOM, không chỉ tạm dừng — để không còn gì
 * của bên thứ ba chạy ngầm khi bạn đã tắt.
 */
import { useEffect, useRef, useState } from 'react';

const MAC_DINH = '3LUJ_cp655M';
const KHOA = 'office-nhac-id';

/** Bóc mã video hoặc mã playlist từ một đường dẫn YouTube bất kỳ. */
export function bocMa(s: string): { video?: string; list?: string } | null {
  const t = s.trim();
  if (!t) return null;
  // Dán thẳng mã cũng được
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return { video: t };
  if (/^PL[A-Za-z0-9_-]{10,}$/.test(t)) return { list: t };
  let u: URL;
  try {
    u = new URL(t.startsWith('http') ? t : `https://${t}`);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(u.hostname)) return null;
  const list = u.searchParams.get('list');
  // youtu.be/<id>  |  /watch?v=<id>  |  /embed/<id>  |  /shorts/<id>
  const video =
    u.hostname.endsWith('youtu.be')
      ? u.pathname.slice(1)
      : u.searchParams.get('v') || u.pathname.match(/\/(?:embed|shorts|v)\/([A-Za-z0-9_-]{11})/)?.[1] || '';
  if (list?.startsWith('PL')) return { list, video: video || undefined };
  return video ? { video } : null;
}

export default function NhacNen() {
  const [ma, datMa] = useState<string>(MAC_DINH);
  const [chay, datChay] = useState(false);
  const [mo, datMo] = useState(false);
  const [nhap, datNhap] = useState('');
  const [loi, datLoi] = useState('');
  const oNhap = useRef<HTMLInputElement>(null);

  // Chỉ đọc localStorage sau khi gắn vào DOM: đọc lúc dựng trên máy chủ sẽ lệch
  // giữa HTML máy chủ gửi xuống và HTML trình duyệt dựng lại.
  useEffect(() => {
    try {
      const luu = localStorage.getItem(KHOA);
      if (luu) datMa(luu);
    } catch {
      /* trình duyệt chặn lưu trữ: dùng mặc định */
    }
  }, []);

  const luuMa = (m: string) => {
    datMa(m);
    try {
      localStorage.setItem(KHOA, m);
    } catch {
      /* không lưu được thì vẫn phát được, chỉ là lần sau quên */
    }
  };

  const doiNhac = () => {
    const r = bocMa(nhap);
    if (!r) {
      datLoi('Không nhận ra đường dẫn YouTube. Dán link video hoặc playlist.');
      oNhap.current?.focus();
      return;
    }
    luuMa(r.list ? `list:${r.list}` : r.video!);
    datNhap('');
    datLoi('');
    datChay(true);
  };

  const laList = ma.startsWith('list:');
  const giaTri = laList ? ma.slice(5) : ma;
  // loop=1 cho MỘT video chỉ chạy khi có kèm playlist=<chính nó>. Đây là cách
  // YouTube quy định, không phải mẹo vặt — thiếu nó là hết bài thì dừng.
  const src = laList
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${giaTri}&autoplay=1&loop=1&rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/${giaTri}?autoplay=1&loop=1&playlist=${giaTri}&rel=0&modestbranding=1`;

  return (
    <div className="pop-wrap nhac-wrap">
      <button
        type="button"
        className="tb-btn nhac-bam"
        aria-pressed={chay}
        title={chay ? 'Tắt nhạc' : 'Bật nhạc'}
        onClick={() => {
          const m = !chay;
          datChay(m);
          // Bật thì mở bảng: trình duyệt có thể chặn tự động phát, khi đó người
          // dùng phải tự bấm nút play của YouTube — bảng đóng thì không với tới.
          // Thu gọn lại sau đó thì nhạc vẫn chạy.
          datMo(m);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
          <path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
          <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
        </svg>
        <span className="lbl">{chay ? 'Đang phát' : 'Nhạc'}</span>
      </button>
      <button
        type="button"
        className="tb-btn tb-icon nhac-mo-bang"
        aria-expanded={mo}
        aria-controls="pop-nhac"
        title={mo ? 'Thu gọn bảng nhạc' : 'Mở bảng nhạc'}
        onClick={() => datMo(!mo)}
      >
        {/* Mũi tên vẽ bằng SVG, không dùng ký tự ▴/▾: hai ký tự đó nhỏ xíu và
            mờ trên hàng nút này, người dùng không nhận ra là bấm được. */}
        <svg viewBox="0 0 16 16" aria-hidden="true" width="15" height="15" className={mo ? 'nhac-xoay' : ''}>
          <path d="M4 6.5 8 10.5 12 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/*
        Bảng LUÔN ở trong cây DOM khi đang phát; đóng bảng chỉ đẩy nó ra ngoài
        màn hình bằng CSS. Bản trước bọc cả khối này trong `{mo && …}`, nên đóng
        bảng là gỡ luôn <iframe> — nút vẫn sáng "Đang phát" trong khi không có
        gì phát. Gỡ khỏi cây cũng khiến React dựng lại iframe lúc mở lại, tức
        nhạc chạy lại từ đầu.
      */}
      <div
        id="pop-nhac"
        className={`pop pop-nhac${mo ? '' : ' nhac-an'}`}
        role="dialog"
        aria-label="Nhạc nền"
        aria-hidden={!mo}
      >
        <div className="nhac-khung">
          {chay ? (
            <iframe
              src={src}
              title="Nhạc nền"
              allow="autoplay; encrypted-media"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <p className="nhac-tat">Đang tắt. Bấm nút Nhạc để phát.</p>
          )}
        </div>
        <label className="nhac-doi">
          <span>Đổi nhạc</span>
          <input
            ref={oNhap}
            type="text"
            value={nhap}
            placeholder="Dán link YouTube (video hoặc playlist)"
            onChange={(e) => {
              datNhap(e.target.value);
              datLoi('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doiNhac();
            }}
          />
          <button type="button" onClick={doiNhac}>Dùng</button>
        </label>
        {loi && <p className="nhac-loi">{loi}</p>}
        <p className="nhac-ghi">
          Phát qua trình phát chính thức của YouTube. Tắt là gỡ hẳn khung phát,
          không chạy ngầm. Thu gọn bảng thì nhạc vẫn chạy.
        </p>
      </div>
    </div>
  );
}
