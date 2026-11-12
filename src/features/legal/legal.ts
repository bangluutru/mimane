import type { SupportLang } from '@/languages/types';

/*
 * Giới thiệu, Chính sách bảo mật, Điều khoản (anh Bằng chốt 2026-11-12):
 * mọi trang con chottoday.com ghi người vận hành "Chiba Bang", liên hệ
 * support@chottoday.com, không công khai địa chỉ / điện thoại.
 * Văn bản tả đúng những gì app làm hôm nay (dữ liệu chỉ ở trình duyệt,
 * YouTube, mô hình Whisper từ Hugging Face, máy chép lời chạy trên máy người
 * dùng). Đổi cách lưu dữ liệu hay thêm dịch vụ ngoài thì sửa file này cùng lúc.
 */
export const OPERATOR = 'Chiba Bang';
export const CONTACT_EMAIL = 'support@chottoday.com';

export type LegalKind = 'about' | 'privacy' | 'terms';
type Doc = { title: string; intro: string; sections: { h: string; p: string[] }[] };
type Legal = { nav: Record<LegalKind | 'contact', string>; updated: string; docs: Record<LegalKind, Doc> };

export const LEGAL: Record<SupportLang, Legal> = {
  vi: {
    nav: { about: 'Giới thiệu', privacy: 'Chính sách bảo mật', terms: 'Điều khoản sử dụng', contact: 'Liên hệ' },
    updated: 'Cập nhật lần cuối: 12/11/2026',
    docs: {
      about: {
        title: 'Giới thiệu Mimane',
        intro: 'Mimane là ứng dụng miễn phí để học ngôn ngữ qua video và âm thanh thật: nghe, đọc, nhắc lại, shadowing, ghi âm, so sánh và ôn từng câu. Mimane là một công cụ học của Chotto (chottoday.com).',
        sections: [
          { h: 'Dành cho ai', p: ['Người Việt học tiếng Nhật, người Việt học tiếng Anh, và người nước ngoài học tiếng Việt. Không cần đăng ký tài khoản.'] },
          { h: 'Người vận hành và liên hệ', p: [`Người vận hành: ${OPERATOR}`, `Liên hệ: ${CONTACT_EMAIL}`] },
        ],
      },
      privacy: {
        title: 'Chính sách bảo mật',
        intro: 'Chính sách này nói rõ ứng dụng lưu gì và gửi gì đi.',
        sections: [
          { h: '1. Không có tài khoản', p: ['Ứng dụng không có đăng nhập và không hỏi tên, email hay thông tin cá nhân nào của bạn.'] },
          { h: '2. Dữ liệu lưu trên máy bạn', p: ['Cài đặt, tiến độ, bản ghi âm giọng bạn, tệp bạn nhập và lời chép đều lưu trong trình duyệt (localStorage, IndexedDB), không gửi về máy chủ của chúng tôi. Xoá dữ liệu trang web trong trình duyệt là xoá hết.', 'Micro chỉ bật khi bạn bấm ghi âm.'] },
          { h: '3. Chép lời tự động', p: ['Khi chép lời ngay trong trình duyệt, mô hình nhận dạng giọng nói được tải một lần từ Hugging Face; Hugging Face nhận địa chỉ IP của bạn khi tải. Âm thanh không gửi đi đâu.', 'Nếu bạn dùng máy chép lời riêng (chạy ở 127.0.0.1 trên máy tính của bạn), âm thanh chỉ đi tới chính máy đó.'] },
          { h: '4. Dịch vụ bên ngoài', p: ['Bài học từ link YouTube được phát qua trình phát nhúng youtube-nocookie.com của YouTube; YouTube (Google) xử lý dữ liệu theo chính sách của họ. Phông chữ tải từ Google Fonts, nên Google nhận địa chỉ IP và thông tin trình duyệt khi tải. Link tra từ điển mở trang của bên thứ ba.', 'Trang chạy trên Cloudflare. Cloudflare Web Analytics đếm lượt xem; theo Cloudflare, công cụ này không dùng cookie và không dùng địa chỉ IP để nhận ra bạn.'] },
          { h: '5. Liên hệ', p: [`Người vận hành: ${OPERATOR}`, `Câu hỏi về dữ liệu xin gửi tới ${CONTACT_EMAIL}.`] },
        ],
      },
      terms: {
        title: 'Điều khoản sử dụng',
        intro: 'Dùng ứng dụng nghĩa là bạn đồng ý với các điều khoản dưới đây.',
        sections: [
          { h: '1. Dịch vụ', p: ['Ứng dụng miễn phí, dùng cho việc học cá nhân.'] },
          { h: '2. Nội dung bạn nhập', p: ['Bạn chỉ nhập video, âm thanh hay link mà bạn có quyền dùng. Nội dung đó ở lại trên máy bạn và bạn chịu trách nhiệm về nó.'] },
          { h: '3. Nội dung của ứng dụng', p: ['Bài học, lời dịch và dữ liệu từ điển chỉ được dùng để học. Không sao chép, đăng lại, phân phối hay thu thập tự động (bot, crawl, scrape).'] },
          { h: '4. Miễn trừ', p: ['Ứng dụng được cung cấp như hiện có và có thể thay đổi hoặc ngừng mà không báo trước. Lời chép tự động có thể sai. Dữ liệu lưu trong trình duyệt có thể mất khi bạn xoá dữ liệu hoặc đổi máy.'] },
          { h: '5. Thay đổi điều khoản', p: ['Điều khoản có thể được cập nhật. Tiếp tục dùng nghĩa là bạn chấp nhận điều khoản mới.'] },
          { h: '6. Liên hệ', p: [`Người vận hành: ${OPERATOR}`, `Liên hệ: ${CONTACT_EMAIL}`] },
        ],
      },
    },
  },
  en: {
    nav: { about: 'About', privacy: 'Privacy Policy', terms: 'Terms of Use', contact: 'Contact' },
    updated: 'Last updated: 12 November 2026',
    docs: {
      about: {
        title: 'About Mimane',
        intro: 'Mimane is a free app for learning languages from real video and audio: listen, read, repeat, shadow, record, compare and review sentence by sentence. It is one of the learning tools of Chotto (chottoday.com).',
        sections: [
          { h: 'Who it is for', p: ['Vietnamese speakers learning Japanese or English, and anyone learning Vietnamese. No account needed.'] },
          { h: 'Operator and contact', p: [`Operator: ${OPERATOR}`, `Contact: ${CONTACT_EMAIL}`] },
        ],
      },
      privacy: {
        title: 'Privacy Policy',
        intro: 'This policy explains what the app stores and what it sends.',
        sections: [
          { h: '1. No account', p: ['The app has no sign-in and does not ask for your name, e-mail or any personal information.'] },
          { h: '2. Data on your device', p: ['Settings, progress, your voice recordings, files you import and transcripts are kept in your browser (localStorage, IndexedDB) and are not sent to our servers. Clearing this site\'s data in your browser removes them.', 'The microphone is used only while you record.'] },
          { h: '3. Automatic transcription', p: ['When transcription runs in your browser, the speech model is downloaded once from Hugging Face, which receives your IP address. Your audio is not sent anywhere.', 'If you use your own transcriber (running at 127.0.0.1 on your computer), audio goes only to that computer.'] },
          { h: '4. Outside services', p: ['Lessons from YouTube links play in YouTube\'s embedded player (youtube-nocookie.com); YouTube (Google) handles data under its own policy. Fonts are loaded from Google Fonts, so Google receives your IP address and browser details when they load. Dictionary links open third-party sites.', 'The site runs on Cloudflare. Cloudflare Web Analytics counts page views; according to Cloudflare it uses no cookies and does not use your IP address to identify you.'] },
          { h: '5. Contact', p: [`Operator: ${OPERATOR}`, `Questions about data: ${CONTACT_EMAIL}`] },
        ],
      },
      terms: {
        title: 'Terms of Use',
        intro: 'By using the app you agree to these terms.',
        sections: [
          { h: '1. The service', p: ['The app is free and meant for personal study.'] },
          { h: '2. What you import', p: ['Only import video, audio or links you have the right to use. That content stays on your device and you are responsible for it.'] },
          { h: '3. App content', p: ['Lessons, translations and dictionary data may be used only for study. Do not copy, repost, distribute or collect them automatically (bots, crawling, scraping).'] },
          { h: '4. Disclaimer', p: ['The app is provided as is and may change or stop without notice. Automatic transcripts can be wrong. Data kept in your browser can be lost if you clear site data or change devices.'] },
          { h: '5. Changes', p: ['These terms may be updated. Continuing to use the app means you accept the new terms.'] },
          { h: '6. Contact', p: [`Operator: ${OPERATOR}`, `Contact: ${CONTACT_EMAIL}`] },
        ],
      },
    },
  },
  ja: {
    nav: { about: 'このアプリについて', privacy: 'プライバシーポリシー', terms: '利用規約', contact: 'お問い合わせ' },
    updated: '最終更新日：2026年11月12日',
    docs: {
      about: {
        title: 'Mimaneについて',
        intro: 'Mimaneは、本物の動画や音声で言語を学ぶ無料アプリです。一文ずつ、聞く・読む・まねる・シャドーイング・録音・比べる・復習ができます。Chotto（chottoday.com）の学習ツールの一つです。',
        sections: [
          { h: '対象', p: ['日本語や英語を学ぶベトナム語話者、ベトナム語を学ぶ方。アカウント登録は不要です。'] },
          { h: '運営者・お問い合わせ', p: [`運営者：${OPERATOR}`, `お問い合わせ：${CONTACT_EMAIL}`] },
        ],
      },
      privacy: {
        title: 'プライバシーポリシー',
        intro: '本アプリが保存する情報と送信する情報を説明します。',
        sections: [
          { h: '1. アカウントなし', p: ['本アプリにはログインがなく、氏名・メールアドレスなどの個人情報をお尋ねしません。'] },
          { h: '2. 端末に保存するデータ', p: ['設定、進捗、ご自身の録音、取り込んだファイル、文字起こしはブラウザ（localStorage、IndexedDB）に保存され、当方のサーバーには送信されません。ブラウザでこのサイトのデータを削除すると消えます。', 'マイクは録音中のみ使用します。'] },
          { h: '3. 自動文字起こし', p: ['ブラウザ内で文字起こしを行う場合、音声認識モデルを Hugging Face から一度だけダウンロードし、その際に Hugging Face が IP アドレスを受け取ります。音声はどこにも送信されません。', 'ご自身の文字起こしサーバー（お使いのパソコンの 127.0.0.1 で動作）を使う場合、音声はそのパソコンにのみ送られます。'] },
          { h: '4. 外部サービス', p: ['YouTube のリンクから作ったレッスンは YouTube の埋め込みプレーヤー（youtube-nocookie.com）で再生され、YouTube（Google）が同社のポリシーに従ってデータを扱います。フォントは Google Fonts から読み込むため、その際に Google が IP アドレスとブラウザ情報を受け取ります。辞書リンクは第三者のサイトを開きます。', '本サイトは Cloudflare 上で動作し、Cloudflare Web Analytics でページビューを数えています。Cloudflare によると、Cookie を使わず、IP アドレスで利用者を識別しません。'] },
          { h: '5. お問い合わせ', p: [`運営者：${OPERATOR}`, `データに関するお問い合わせ：${CONTACT_EMAIL}`] },
        ],
      },
      terms: {
        title: '利用規約',
        intro: '本アプリのご利用をもって、以下の規約に同意したものとみなします。',
        sections: [
          { h: '1. サービス', p: ['本アプリは無料で、個人の学習を目的としています。'] },
          { h: '2. 取り込むコンテンツ', p: ['取り込む動画・音声・リンクは、利用する権利のあるものに限ります。取り込んだ内容は端末に残り、その責任はご本人にあります。'] },
          { h: '3. アプリのコンテンツ', p: ['レッスン、翻訳、辞書データは学習のためにのみ利用できます。複製・転載・配布、自動収集（ボット、クロール、スクレイピング）は禁止します。'] },
          { h: '4. 免責', p: ['本アプリは現状のまま提供され、予告なく変更・停止することがあります。自動文字起こしには誤りが含まれることがあります。ブラウザに保存されたデータは、データ削除や端末変更で失われることがあります。'] },
          { h: '5. 規約の変更', p: ['本規約は更新されることがあります。利用を続けた場合、新しい規約に同意したものとみなします。'] },
          { h: '6. お問い合わせ', p: [`運営者：${OPERATOR}`, `お問い合わせ：${CONTACT_EMAIL}`] },
        ],
      },
    },
  },
};
