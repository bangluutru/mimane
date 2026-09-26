import { useMemo } from 'react';
import { useProfile } from '@/domains/user/profile';
import type { Localized, SupportLang } from '@/languages/types';

/**
 * UI strings. The UI language follows the learner's support language, so a
 * Japanese speaker learning Vietnamese sees a Japanese UI.
 */
const en = {
  app: { tagline: 'Listen · Shadow · Speak' },
  nav: { home: 'Home', library: 'Library', review: 'Review', progress: 'Progress', import: 'Add lesson', settings: 'Settings' },
  lang: { ja: 'Japanese', en: 'English', vi: 'Vietnamese', learning: 'Learning', speak: 'I speak', learn: 'I want to learn' },
  home: {
    continue: 'Continue learning',
    recommended: 'Recommended for you',
    topics: 'Explore topics',
    level: 'Explore by level',
    short: 'Short practice',
    shortHint: 'under 3 minutes',
    deep: 'Deep listening',
    deepHint: '10+ minutes',
    deepEmpty: 'No long lessons yet. Import a talk or podcast episode to practise deep listening.',
    empty: 'No lessons for this language yet.',
    importCta: 'Import your own video or audio',
    greeting: 'What would you like to listen to today?',
  },
  lesson: {
    sentences: '{n} sentences',
    synthetic: 'Synthesized voice',
    syntheticHint: 'Demo lesson with a synthesized voice. Import real recordings for authentic speech.',
    mine: 'My lesson',
    completed: 'Completed',
    progress: '{n}% practised',
    notFound: 'Lesson not found.',
    delete: 'Delete lesson',
    deleteConfirm: 'Delete this lesson and its media from this device?',
  },
  library: {
    title: 'Library',
    search: 'Search title, topic, keyword…',
    all: 'All',
    anyLevel: 'Any level',
    anyTopic: 'Any topic',
    anyLength: 'Any length',
    short: '< 3 min',
    medium: '3–10 min',
    deep: '10+ min',
    anyAccent: 'Any accent',
    results: '{n} lessons',
    none: 'Nothing matches. Try fewer filters.',
  },
  mode: {
    listen: 'Listen', read: 'Listen & Read', repeat: 'Repeat', shadow: 'Shadow', dictation: 'Dictation',
    listenHint: 'Just listen. Subtitles are optional.',
    readHint: 'Listen with the transcript, translation and reading aids.',
    repeatHint: 'The speaker pauses after each sentence — say it back.',
    shadowHint: 'Speak along with the speaker, almost at the same time.',
    dictationHint: 'Listen and type what you hear.',
  },
  player: {
    play: 'Play', pause: 'Pause', prev: 'Previous sentence', next: 'Next sentence', replay: 'Replay sentence',
    loop: 'Loop sentence', loopOn: 'Looping', speed: 'Speed', record: 'Record', stop: 'Stop',
    settings: 'Display & practice settings', transcript: 'Transcript', backToCurrent: 'Back to current',
    yourTurn: 'Your turn', hidden: 'Subtitle hidden — tap to reveal', tapToReveal: 'Reveal',
    favorite: 'Save sentence', difficult: 'Mark as difficult', note: 'Note',
    autoPause: 'Pause after each sentence', repeatGap: 'Pause length', loopCount: 'Plays per loop', infinite: '∞',
    showTranslation: 'Translation', showPronunciation: 'Reading aids', hideSubtitle: 'Hide subtitle',
    furigana: 'Furigana', ipa: 'IPA & stress', linking: 'Linking & weak forms', toneColors: 'Tone colours',
    headphones: 'Tip: use headphones while shadowing so the recording only captures your voice.',
    mediaError: 'The media could not be loaded.',
    loading: 'Loading lesson…',
    sync: 'Tap-to-sync',
    shortcuts: 'Space play/pause · ←/→ sentence · R replay · L loop · M record',
    noTranslation: 'No translation in your language for this lesson.',
  },
  rec: {
    title: 'Your recordings',
    record: 'Record',
    stop: 'Stop',
    recording: 'Recording…',
    playMe: 'Play me',
    compare: 'Native ↔ Me',
    rerecord: 'Record again',
    delete: 'Delete',
    attempt: 'Attempt {n}',
    none: 'Record yourself saying this sentence, then compare with the native audio.',
    micDenied: 'Microphone access was denied. Allow it in your browser to record.',
    unsupported: 'Recording is not supported in this browser.',
    private: 'Recordings stay on this device. Nothing is uploaded.',
    noScore: 'No automatic score: compare by ear — rhythm, length, pitch, and sounds.',
    native: 'Native',
    me: 'Me',
  },
  vocab: {
    save: 'Save word', saved: 'Saved', remove: 'Remove', meaning: 'Meaning', noMeaning: 'No offline meaning for this word yet.',
    yourMeaning: 'Add your own meaning…', reading: 'Reading', lemma: 'Dictionary form', pos: 'Part of speech',
    conjugation: 'Form', level: 'Level', lookup: 'Look up', parts: 'Parts', phrase: 'Phrase', stress: 'Stress',
    syllables: 'Syllables', tone: 'Tone', initial: 'Initial', medial: 'Glide', nucleus: 'Vowel', final: 'Final',
    regional: 'Regional pronunciation', source: { lexicon: 'lesson dictionary', wordlist: 'JLPT list', kanji: 'estimated from kanji' },
    weak: 'Often reduced to /{f}/ in connected speech', links: 'Links to the next word',
    stressOn: 'stress on syllable {n}',
  },
  dictation: {
    placeholder: 'Type what you hear…', check: 'Check', reveal: 'Show answer', next: 'Next', again: 'Listen again',
    result: '{c} / {t} correct', missing: 'missing', extra: 'extra', accent: 'Right letters — check the tone / accent marks', hint: 'Press Enter to check. Listen as many times as you like.',
  },
  review: {
    title: 'Review', difficult: 'Difficult', favorites: 'Saved sentences', vocabulary: 'Vocabulary', recordings: 'Recordings',
    emptyDifficult: 'Sentences you mark as difficult appear here.', emptyFavorites: 'Sentences you save appear here.',
    emptyVocab: 'Tap a word in any transcript to save it.', emptyRecordings: 'Your recordings appear here.',
    practice: 'Practise', deleteAll: 'Delete all recordings', deleteAllConfirm: 'Delete all recordings from this device?',
  },
  progress: {
    title: 'Progress', listened: 'Minutes listened', shadowed: 'Minutes shadowing', sentences: 'Sentences practised',
    lessons: 'Lessons completed', words: 'Words saved', history: 'Recent lessons', none: 'Start a lesson to see your progress here.',
  },
  import: {
    title: 'Add a lesson', subtitle: 'Turn any video or audio into sentence-by-sentence practice.',
    media: '1. Media', youtube: 'YouTube link', file: 'Upload audio / video', youtubePlaceholder: 'https://www.youtube.com/watch?v=…',
    invalidYoutube: 'That does not look like a YouTube link.',
    transcript: '2. Transcript', transcriptHint: 'SRT, VTT, TXT (with or without timestamps) or JSON. Upload a file or paste text.',
    paste: 'Paste transcript here…', uploadSub: 'Upload subtitle file',
    translation: '3. Translation (optional)', translationHint: 'A second subtitle file in your language, aligned by time.',
    details: '4. Details', titleField: 'Title', language: 'Language', level: 'Level', auto: 'Estimate automatically',
    categories: 'Topics', tags: 'Tags (comma separated)', accent: 'Accent', merge: 'Merge subtitle lines into full sentences',
    create: 'Create lesson', analysing: 'Analysing sentences…', cues: '{n} lines found', noTimings: 'No timestamps found — you will tap along with the audio to sync each sentence.',
    needTranscript: 'Add a transcript first.', needMedia: 'Add a YouTube link or a media file.', yourLanguage: 'Translation language',
    privacy: 'Everything is processed and stored on this device.',
  },
  sync: {
    title: 'Sync sentences', hint: 'Play the media and tap “Next sentence starts” exactly when each sentence begins.',
    mark: 'Next sentence starts', undo: 'Undo', done: 'Finish', progress: '{i} / {n} synced',
  },
  asr: {
    title: 'Auto-transcribe', hint: 'Recognise the speech with Whisper, then review and correct the text below before practising.',
    button: 'Transcribe audio', cancel: 'Cancel', needMedia: 'Add a YouTube link or a media file first.',
    engineServer: 'Local Whisper large-v3-turbo · on this computer', engineBrowser: 'In-browser Whisper · slower and less accurate',
    serverOff: 'The local transcriber is not running. For best accuracy (and for YouTube) start it with:',
    youtubeNeedsServer: 'YouTube audio can only be transcribed by the local transcriber (it fetches the audio with yt-dlp).',
    ytNote: 'For personal study only: respect the creator’s copyright and YouTube’s Terms.',
    stage: { queued: 'Waiting…', downloading: 'Downloading audio…', 'loading-model': 'Loading speech model…', transcribing: 'Recognising speech…', done: 'Done' },
    done: 'Transcribed {n} sentences with {model}. Please listen and check.',
    review: 'Automatic transcript — may contain mistakes. Listen and correct before practising.',
    auto: 'Auto transcript', quality: 'Accuracy', accurate: 'Accurate', fast: 'Fast',
    settings: 'Transcription', serverUrl: 'Local transcriber URL', check: 'Check', online: 'Connected', offline: 'Not running',
    settingsHint: 'Speech recognition runs on your own computer (faster-whisper). Audio is never uploaded to a cloud service.',
  },
  onboarding: {
    welcome: 'Learn by listening to what you love', intro: 'Pick your languages, your level, and topics you enjoy. You can change this anytime.',
    level: 'My level', interests: 'What are you interested in?', start: 'Start learning', next: 'Next', back: 'Back',
  },
  settings: {
    title: 'Settings', profile: 'Languages & level', display: 'Reading aids', privacy: 'Privacy & data',
    deleteRecordings: 'Delete all recordings', deleteAll: 'Reset app (delete all local data)', deleteAllConfirm: 'Delete all progress, vocabulary, recordings and imported lessons from this device?',
    privacyText: 'Mimane stores everything on this device (IndexedDB). Recordings are never uploaded or sent to AI services.',
    about: 'About & credits',
    credits: 'Japanese analysis: kuromoji.js (IPADIC). JLPT lists: elzup/jlpt-word-list (from Jonathan Waller’s lists), kanji-data (David Gouveia). English pronunciation: CMU Pronouncing Dictionary. Demo audio: synthesized voices.',
    uiLanguage: 'App language follows “I speak”.',
    done: 'Done',
  },
  common: { cancel: 'Cancel', close: 'Close', save: 'Save', delete: 'Delete', open: 'Open', min: 'min', sec: 's', loading: 'Loading…', error: 'Something went wrong.', seeAll: 'See all', edit: 'Edit' },
  pos: {
    noun: 'noun', verb: 'verb', adjective: 'adjective', adverb: 'adverb', pronoun: 'pronoun', particle: 'particle',
    conjunction: 'conjunction', auxiliary: 'auxiliary', interjection: 'interjection', determiner: 'determiner',
    preposition: 'preposition', numeral: 'numeral', classifier: 'classifier', phrase: 'phrase', expression: 'expression',
    prefix: 'prefix', suffix: 'suffix', symbol: 'symbol', other: 'other',
  },
  conj: {
    polite: 'polite', past: 'past', negative: 'negative', desire: 'want to', 'passive/potential': 'passive / potential',
    causative: 'causative', volitional: 'volitional', 'te-form': 'te-form', conditional: 'conditional',
    'progressive/state': 'ongoing / state', completion: 'completion', preparation: 'in advance', try: 'try doing',
    change: 'change', appearance: 'looks like',
  },
  tone: { ngang: 'level', huyen: 'falling', sac: 'rising', hoi: 'dipping', nga: 'broken rising', nang: 'heavy' },
  furigana: { all: 'All', N5: 'N5+', N4: 'N4+', N3: 'N3+', N2: 'N2+', rare: 'Rare only', off: 'Off' },
  accent: { 'ja-tokyo': 'Tokyo', 'en-us': 'American', 'en-gb': 'British', 'vi-north': 'Northern', 'vi-central': 'Central', 'vi-south': 'Southern' },
  reasons: { level: 'Your level', interest: 'Your interests', 'topic-history': 'You like this topic', new: 'New' },
};

type Dict = typeof en;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const vi: DeepPartial<Dict> = {
  app: { tagline: 'Nghe · Shadowing · Nói' },
  nav: { home: 'Trang chủ', library: 'Thư viện', review: 'Ôn tập', progress: 'Tiến độ', import: 'Thêm bài', settings: 'Cài đặt' },
  lang: { ja: 'Tiếng Nhật', en: 'Tiếng Anh', vi: 'Tiếng Việt', learning: 'Đang học', speak: 'Tôi nói', learn: 'Tôi muốn học' },
  home: {
    continue: 'Học tiếp', recommended: 'Gợi ý cho bạn', topics: 'Khám phá chủ đề', level: 'Theo trình độ',
    short: 'Luyện nhanh', shortHint: 'dưới 3 phút', deep: 'Nghe sâu', deepHint: 'từ 10 phút',
    deepEmpty: 'Chưa có bài dài. Hãy nhập một bài nói hoặc podcast để luyện nghe sâu.',
    empty: 'Chưa có bài học cho ngôn ngữ này.', importCta: 'Nhập video hoặc audio của bạn',
    greeting: 'Hôm nay bạn muốn nghe gì?',
  },
  lesson: {
    sentences: '{n} câu', synthetic: 'Giọng tổng hợp',
    syntheticHint: 'Bài mẫu dùng giọng đọc tổng hợp. Hãy nhập bản ghi thật để nghe giọng tự nhiên.',
    mine: 'Bài của tôi', completed: 'Đã hoàn thành', progress: 'Đã luyện {n}%', notFound: 'Không tìm thấy bài học.',
    delete: 'Xóa bài', deleteConfirm: 'Xóa bài học và media của bài khỏi thiết bị này?',
  },
  library: {
    title: 'Thư viện', search: 'Tìm tiêu đề, chủ đề, từ khóa…', all: 'Tất cả', anyLevel: 'Mọi trình độ', anyTopic: 'Mọi chủ đề',
    anyLength: 'Mọi độ dài', short: '< 3 phút', medium: '3–10 phút', deep: '10+ phút', anyAccent: 'Mọi giọng',
    results: '{n} bài', none: 'Không có bài phù hợp. Thử bớt bộ lọc.',
  },
  mode: {
    listen: 'Nghe', read: 'Nghe & Đọc', repeat: 'Nói theo', shadow: 'Shadowing', dictation: 'Chép chính tả',
    listenHint: 'Chỉ nghe. Phụ đề có thể bật/tắt.', readHint: 'Nghe cùng transcript, bản dịch và hỗ trợ phát âm.',
    repeatHint: 'Người nói dừng sau mỗi câu — bạn nói lại.', shadowHint: 'Nói gần như cùng lúc với người bản xứ.',
    dictationHint: 'Nghe và gõ lại những gì bạn nghe.',
  },
  player: {
    play: 'Phát', pause: 'Tạm dừng', prev: 'Câu trước', next: 'Câu sau', replay: 'Nghe lại câu', loop: 'Lặp câu', loopOn: 'Đang lặp',
    speed: 'Tốc độ', record: 'Ghi âm', stop: 'Dừng', settings: 'Hiển thị & luyện tập', transcript: 'Transcript',
    backToCurrent: 'Về câu hiện tại', yourTurn: 'Đến lượt bạn', hidden: 'Phụ đề đang ẩn — chạm để xem', tapToReveal: 'Hiện',
    favorite: 'Lưu câu', difficult: 'Đánh dấu câu khó', note: 'Ghi chú', autoPause: 'Dừng sau mỗi câu', repeatGap: 'Thời gian dừng',
    loopCount: 'Số lần lặp', showTranslation: 'Bản dịch', showPronunciation: 'Hỗ trợ đọc', hideSubtitle: 'Ẩn phụ đề',
    furigana: 'Furigana', ipa: 'IPA & trọng âm', linking: 'Nối âm & âm yếu', toneColors: 'Tô màu thanh điệu',
    headphones: 'Mẹo: đeo tai nghe khi shadowing để bản ghi chỉ có giọng của bạn.', mediaError: 'Không tải được media.',
    loading: 'Đang tải bài…', sync: 'Đồng bộ thủ công', shortcuts: 'Space phát/dừng · ←/→ chuyển câu · R nghe lại · L lặp · M ghi âm',
    noTranslation: 'Bài này chưa có bản dịch sang ngôn ngữ của bạn.',
  },
  rec: {
    title: 'Bản ghi của bạn', record: 'Ghi âm', stop: 'Dừng', recording: 'Đang ghi…', playMe: 'Nghe tôi', compare: 'Bản xứ ↔ Tôi',
    rerecord: 'Ghi lại', delete: 'Xóa', attempt: 'Lần {n}', none: 'Ghi âm bạn nói câu này, rồi so sánh với giọng bản xứ.',
    micDenied: 'Chưa được cấp quyền micro. Hãy cho phép trong trình duyệt để ghi âm.', unsupported: 'Trình duyệt này không hỗ trợ ghi âm.',
    private: 'Bản ghi chỉ lưu trên thiết bị này. Không tải lên đâu cả.',
    noScore: 'Không chấm điểm tự động: hãy tự so sánh bằng tai — nhịp, độ dài, cao độ và âm.', native: 'Bản xứ', me: 'Tôi',
  },
  vocab: {
    save: 'Lưu từ', saved: 'Đã lưu', remove: 'Bỏ lưu', meaning: 'Nghĩa', noMeaning: 'Chưa có nghĩa trong từ điển offline.',
    yourMeaning: 'Tự thêm nghĩa…', reading: 'Cách đọc', lemma: 'Dạng từ điển', pos: 'Từ loại', conjugation: 'Dạng', level: 'Trình độ',
    lookup: 'Tra cứu', parts: 'Thành phần', phrase: 'Cụm từ', stress: 'Trọng âm', syllables: 'Âm tiết', tone: 'Thanh',
    initial: 'Phụ âm đầu', medial: 'Âm đệm', nucleus: 'Âm chính', final: 'Âm cuối', regional: 'Phát âm theo vùng',
    source: { lexicon: 'từ điển bài học', wordlist: 'danh sách JLPT', kanji: 'ước lượng từ kanji' },
    weak: 'Thường đọc lướt thành /{f}/ khi nói nhanh', links: 'Nối âm với từ sau', stressOn: 'trọng âm ở âm tiết {n}',
  },
  dictation: {
    placeholder: 'Gõ những gì bạn nghe…', check: 'Kiểm tra', reveal: 'Xem đáp án', next: 'Câu sau', again: 'Nghe lại',
    result: 'Đúng {c} / {t}', missing: 'thiếu', extra: 'thừa', accent: 'Đúng chữ — kiểm tra lại dấu', hint: 'Nhấn Enter để kiểm tra. Nghe lại bao nhiêu lần cũng được.',
  },
  review: {
    title: 'Ôn tập', difficult: 'Câu khó', favorites: 'Câu đã lưu', vocabulary: 'Từ vựng', recordings: 'Bản ghi',
    emptyDifficult: 'Câu bạn đánh dấu khó sẽ hiện ở đây.', emptyFavorites: 'Câu bạn lưu sẽ hiện ở đây.',
    emptyVocab: 'Chạm vào một từ trong transcript để lưu.', emptyRecordings: 'Bản ghi âm của bạn sẽ hiện ở đây.',
    practice: 'Luyện', deleteAll: 'Xóa tất cả bản ghi', deleteAllConfirm: 'Xóa tất cả bản ghi âm khỏi thiết bị này?',
  },
  progress: {
    title: 'Tiến độ', listened: 'Phút đã nghe', shadowed: 'Phút shadowing', sentences: 'Câu đã luyện', lessons: 'Bài hoàn thành',
    words: 'Từ đã lưu', history: 'Bài gần đây', none: 'Bắt đầu một bài học để xem tiến độ ở đây.',
  },
  import: {
    title: 'Thêm bài học', subtitle: 'Biến video hoặc audio bất kỳ thành bài luyện từng câu.', media: '1. Media',
    youtube: 'Link YouTube', file: 'Tải audio / video', invalidYoutube: 'Đây có vẻ không phải link YouTube.',
    transcript: '2. Transcript', transcriptHint: 'SRT, VTT, TXT (có hoặc không có mốc thời gian) hoặc JSON. Tải file hoặc dán văn bản.',
    paste: 'Dán transcript vào đây…', uploadSub: 'Tải file phụ đề', translation: '3. Bản dịch (tùy chọn)',
    translationHint: 'Một file phụ đề thứ hai bằng ngôn ngữ của bạn, khớp theo thời gian.', details: '4. Thông tin',
    titleField: 'Tiêu đề', language: 'Ngôn ngữ', level: 'Trình độ', auto: 'Tự ước lượng', categories: 'Chủ đề',
    tags: 'Tag (cách nhau bằng dấu phẩy)', accent: 'Giọng', merge: 'Gộp các dòng phụ đề thành câu hoàn chỉnh',
    create: 'Tạo bài học', analysing: 'Đang phân tích câu…', cues: 'Tìm thấy {n} dòng',
    noTimings: 'Không có mốc thời gian — bạn sẽ chạm theo audio để đồng bộ từng câu.', needTranscript: 'Hãy thêm transcript.',
    needMedia: 'Hãy thêm link YouTube hoặc file media.', yourLanguage: 'Ngôn ngữ bản dịch',
    privacy: 'Mọi thứ được xử lý và lưu trên thiết bị này.',
  },
  sync: {
    title: 'Đồng bộ câu', hint: 'Phát media và chạm “Câu tiếp theo bắt đầu” đúng lúc mỗi câu bắt đầu.', mark: 'Câu tiếp theo bắt đầu',
    undo: 'Hoàn tác', done: 'Xong', progress: 'Đã đồng bộ {i} / {n}',
  },
  asr: {
    title: 'Tự tạo transcript', hint: 'Nhận dạng giọng nói bằng Whisper, sau đó nghe lại và sửa văn bản bên dưới trước khi luyện.',
    button: 'Nhận dạng audio', cancel: 'Hủy', needMedia: 'Hãy thêm link YouTube hoặc file media trước.',
    engineServer: 'Whisper large-v3-turbo · chạy trên máy này', engineBrowser: 'Whisper trong trình duyệt · chậm hơn, kém chính xác hơn',
    serverOff: 'Trình nhận dạng cục bộ chưa chạy. Để chính xác nhất (và để dùng với YouTube), hãy chạy:',
    youtubeNeedsServer: 'Audio YouTube chỉ nhận dạng được qua trình nhận dạng cục bộ (tải audio bằng yt-dlp).',
    ytNote: 'Chỉ dùng cho mục đích học cá nhân: tôn trọng bản quyền của tác giả và Điều khoản của YouTube.',
    stage: { queued: 'Đang chờ…', downloading: 'Đang tải audio…', 'loading-model': 'Đang nạp mô hình giọng nói…', transcribing: 'Đang nhận dạng…', done: 'Xong' },
    done: 'Đã nhận dạng {n} câu bằng {model}. Hãy nghe lại và kiểm tra.',
    review: 'Transcript tự động — có thể có lỗi. Hãy nghe và sửa trước khi luyện.',
    auto: 'Transcript tự động', quality: 'Độ chính xác', accurate: 'Chính xác', fast: 'Nhanh',
    settings: 'Nhận dạng giọng nói', serverUrl: 'Địa chỉ trình nhận dạng cục bộ', check: 'Kiểm tra', online: 'Đã kết nối', offline: 'Chưa chạy',
    settingsHint: 'Nhận dạng giọng nói chạy trên chính máy của bạn (faster-whisper). Audio không bao giờ được tải lên dịch vụ đám mây.',
  },
  onboarding: {
    welcome: 'Học bằng cách nghe những gì bạn yêu thích', intro: 'Chọn ngôn ngữ, trình độ và chủ đề bạn thích. Có thể đổi bất cứ lúc nào.',
    level: 'Trình độ của tôi', interests: 'Bạn quan tâm đến chủ đề nào?', start: 'Bắt đầu học', next: 'Tiếp', back: 'Quay lại',
  },
  settings: {
    title: 'Cài đặt', profile: 'Ngôn ngữ & trình độ', display: 'Hỗ trợ đọc', privacy: 'Quyền riêng tư & dữ liệu',
    deleteRecordings: 'Xóa tất cả bản ghi', deleteAll: 'Đặt lại ứng dụng (xóa mọi dữ liệu cục bộ)',
    deleteAllConfirm: 'Xóa toàn bộ tiến độ, từ vựng, bản ghi và bài đã nhập khỏi thiết bị này?',
    privacyText: 'Mimane lưu mọi thứ trên thiết bị này (IndexedDB). Bản ghi âm không bao giờ được tải lên hay gửi cho dịch vụ AI.',
    about: 'Giới thiệu & ghi công', uiLanguage: 'Ngôn ngữ giao diện theo mục “Tôi nói”.', done: 'Xong',
  },
  common: { cancel: 'Hủy', close: 'Đóng', save: 'Lưu', delete: 'Xóa', open: 'Mở', min: 'phút', sec: 'giây', loading: 'Đang tải…', error: 'Đã xảy ra lỗi.', seeAll: 'Xem tất cả', edit: 'Sửa' },
  pos: {
    noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ', pronoun: 'đại từ', particle: 'trợ từ',
    conjunction: 'liên từ', auxiliary: 'trợ động từ', interjection: 'thán từ', determiner: 'từ hạn định', preposition: 'giới từ',
    numeral: 'số từ', classifier: 'loại từ', phrase: 'cụm từ', expression: 'thành ngữ', prefix: 'tiền tố', suffix: 'hậu tố',
    symbol: 'ký hiệu', other: 'khác',
  },
  conj: {
    polite: 'lịch sự', past: 'quá khứ', negative: 'phủ định', desire: 'muốn', 'passive/potential': 'bị động / khả năng',
    causative: 'sai khiến', volitional: 'ý chí', 'te-form': 'thể て', conditional: 'điều kiện', 'progressive/state': 'đang / trạng thái',
    completion: 'hoàn tất', preparation: 'làm sẵn', try: 'thử', change: 'thay đổi', appearance: 'có vẻ',
  },
  tone: { ngang: 'ngang', huyen: 'huyền', sac: 'sắc', hoi: 'hỏi', nga: 'ngã', nang: 'nặng' },
  furigana: { all: 'Tất cả', rare: 'Chỉ từ hiếm', off: 'Tắt' },
  accent: { 'ja-tokyo': 'Tokyo', 'en-us': 'Mỹ', 'en-gb': 'Anh', 'vi-north': 'Bắc', 'vi-central': 'Trung', 'vi-south': 'Nam' },
  reasons: { level: 'Hợp trình độ', interest: 'Sở thích', 'topic-history': 'Chủ đề bạn hay nghe', new: 'Mới' },
};

const ja: DeepPartial<Dict> = {
  app: { tagline: '聞く・シャドーイング・話す' },
  nav: { home: 'ホーム', library: 'ライブラリ', review: '復習', progress: '進捗', import: 'レッスン追加', settings: '設定' },
  lang: { ja: '日本語', en: '英語', vi: 'ベトナム語', learning: '学習中', speak: '話せる言語', learn: '学びたい言語' },
  home: {
    continue: '続きから', recommended: 'おすすめ', topics: 'トピックから探す', level: 'レベルから探す', short: 'ショート練習',
    shortHint: '3分未満', deep: 'じっくりリスニング', deepHint: '10分以上',
    deepEmpty: '長いレッスンはまだありません。講演やポッドキャストを取り込んでみましょう。',
    empty: 'この言語のレッスンはまだありません。', importCta: '自分の動画・音声を取り込む', greeting: '今日は何を聞きますか？',
  },
  lesson: {
    sentences: '{n}文', synthetic: '合成音声', syntheticHint: '合成音声のデモレッスンです。自然な発話は実際の録音を取り込んでください。',
    mine: 'マイレッスン', completed: '完了', progress: '{n}% 練習済み', notFound: 'レッスンが見つかりません。',
    delete: 'レッスンを削除', deleteConfirm: 'このレッスンとメディアをこの端末から削除しますか？',
  },
  library: {
    title: 'ライブラリ', search: 'タイトル・トピック・キーワード', all: 'すべて', anyLevel: 'すべてのレベル', anyTopic: 'すべてのトピック',
    anyLength: 'すべての長さ', short: '3分未満', medium: '3〜10分', deep: '10分以上', anyAccent: 'すべてのアクセント',
    results: '{n}件', none: '該当するレッスンがありません。',
  },
  mode: {
    listen: 'リスニング', read: '聞いて読む', repeat: 'リピート', shadow: 'シャドーイング', dictation: 'ディクテーション',
    listenHint: '聞くことに集中。字幕は切り替え可。', readHint: 'スクリプト・訳・読み補助と一緒に聞く。',
    repeatHint: '一文ごとに止まるので、声に出して繰り返す。', shadowHint: '音声とほぼ同時に声に出す。',
    dictationHint: '聞こえた通りに入力する。',
  },
  player: {
    play: '再生', pause: '一時停止', prev: '前の文', next: '次の文', replay: 'もう一度', loop: 'ループ', loopOn: 'ループ中', speed: '速度',
    record: '録音', stop: '停止', settings: '表示と練習の設定', transcript: 'スクリプト', backToCurrent: '現在の文へ',
    yourTurn: 'あなたの番', hidden: '字幕は非表示 — タップで表示', tapToReveal: '表示', favorite: '文を保存',
    difficult: '難しい文に印', note: 'メモ', autoPause: '一文ごとに停止', repeatGap: 'ポーズの長さ', loopCount: 'ループ回数',
    showTranslation: '訳', showPronunciation: '読み補助', hideSubtitle: '字幕を隠す', furigana: 'ふりがな', ipa: 'IPA・強勢',
    linking: 'リンキング・弱形', toneColors: '声調の色分け', headphones: 'ヒント：シャドーイング中はイヤホンを使うと自分の声だけ録音できます。',
    mediaError: 'メディアを読み込めませんでした。', loading: '読み込み中…', sync: '手動同期',
    shortcuts: 'Space 再生/停止 · ←/→ 文 · R もう一度 · L ループ · M 録音', noTranslation: 'このレッスンにはあなたの言語の訳がありません。',
  },
  rec: {
    title: '自分の録音', record: '録音', stop: '停止', recording: '録音中…', playMe: '自分を再生', compare: 'ネイティブ ↔ 自分',
    rerecord: '録り直す', delete: '削除', attempt: '{n}回目', none: 'この文を録音して、ネイティブ音声と聞き比べましょう。',
    micDenied: 'マイクへのアクセスが拒否されました。', unsupported: 'このブラウザは録音に対応していません。',
    private: '録音はこの端末にのみ保存され、アップロードされません。', noScore: '自動採点はありません。リズム・長さ・高さ・音を耳で比べましょう。',
    native: 'ネイティブ', me: '自分',
  },
  vocab: {
    save: '単語を保存', saved: '保存済み', remove: '削除', meaning: '意味', noMeaning: 'オフライン辞書に意味がありません。',
    yourMeaning: '自分で意味を追加…', reading: '読み', lemma: '辞書形', pos: '品詞', conjugation: '活用', level: 'レベル',
    lookup: '辞書で調べる', parts: '構成', phrase: 'フレーズ', stress: '強勢', syllables: '音節', tone: '声調',
    initial: '頭子音', medial: '介音', nucleus: '母音', final: '末子音', regional: '地域による発音',
    source: { lexicon: 'レッスン辞書', wordlist: 'JLPTリスト', kanji: '漢字から推定' },
    weak: '会話では /{f}/ と弱く発音されることが多い', links: '次の語とつながる', stressOn: '第{n}音節に強勢',
  },
  dictation: {
    placeholder: '聞こえた通りに入力…', check: '答え合わせ', reveal: '答えを見る', next: '次へ', again: 'もう一度聞く',
    result: '{t}中{c}正解', missing: '不足', extra: '余分', accent: '文字は合っています — 声調記号を確認', hint: 'Enterで答え合わせ。何度でも聞けます。',
  },
  review: {
    title: '復習', difficult: '難しい文', favorites: '保存した文', vocabulary: '単語', recordings: '録音',
    emptyDifficult: '難しい文に印をつけるとここに表示されます。', emptyFavorites: '保存した文がここに表示されます。',
    emptyVocab: 'スクリプトの単語をタップして保存しましょう。', emptyRecordings: '録音がここに表示されます。',
    practice: '練習', deleteAll: '録音をすべて削除', deleteAllConfirm: 'この端末の録音をすべて削除しますか？',
  },
  progress: {
    title: '進捗', listened: 'リスニング（分）', shadowed: 'シャドーイング（分）', sentences: '練習した文', lessons: '完了したレッスン',
    words: '保存した単語', history: '最近のレッスン', none: 'レッスンを始めると進捗が表示されます。',
  },
  import: {
    title: 'レッスンを追加', subtitle: '動画や音声を一文ずつ練習できるレッスンに。', media: '1. メディア', youtube: 'YouTubeリンク',
    file: '音声・動画をアップロード', invalidYoutube: 'YouTubeのリンクではないようです。', transcript: '2. スクリプト',
    transcriptHint: 'SRT・VTT・TXT（タイムスタンプ有無どちらも可）・JSON。', paste: 'ここにスクリプトを貼り付け…',
    uploadSub: '字幕ファイルをアップロード', translation: '3. 訳（任意）', translationHint: 'あなたの言語の字幕ファイル（時間で対応付け）。',
    details: '4. 詳細', titleField: 'タイトル', language: '言語', level: 'レベル', auto: '自動推定', categories: 'トピック',
    tags: 'タグ（カンマ区切り）', accent: 'アクセント', merge: '字幕の行を文単位にまとめる', create: 'レッスンを作成',
    analysing: '文を解析中…', cues: '{n}行', noTimings: 'タイムスタンプがありません。音声に合わせてタップして同期します。',
    needTranscript: 'スクリプトを追加してください。', needMedia: 'YouTubeリンクかメディアファイルを追加してください。',
    yourLanguage: '訳の言語', privacy: 'すべてこの端末で処理・保存されます。',
  },
  sync: { title: '文の同期', hint: 'メディアを再生し、各文が始まる瞬間にボタンをタップ。', mark: '次の文が始まる', undo: '取り消し', done: '完了', progress: '{i} / {n} 同期済み' },
  asr: {
    title: '自動文字起こし', hint: 'Whisperで音声を認識します。練習の前に下のテキストを聞いて確認・修正してください。',
    button: '音声を文字起こし', cancel: 'キャンセル', needMedia: '先にYouTubeリンクかメディアファイルを追加してください。',
    engineServer: 'Whisper large-v3-turbo · このパソコンで実行', engineBrowser: 'ブラウザ内Whisper · 遅く精度も低め',
    serverOff: 'ローカル文字起こしサーバーが起動していません。高精度（YouTube対応）にはこちらを実行:',
    youtubeNeedsServer: 'YouTubeの音声はローカル文字起こしサーバーでのみ処理できます（yt-dlpで取得）。',
    ytNote: '個人学習のみ：作者の著作権とYouTubeの利用規約を守ってください。',
    stage: { queued: '待機中…', downloading: '音声をダウンロード中…', 'loading-model': '音声モデルを読み込み中…', transcribing: '認識中…', done: '完了' },
    done: '{model}で{n}文を認識しました。聞いて確認してください。',
    review: '自動文字起こし — 誤りがある可能性があります。練習前に確認してください。',
    auto: '自動文字起こし', quality: '精度', accurate: '高精度', fast: '高速',
    settings: '文字起こし', serverUrl: 'ローカルサーバーURL', check: '確認', online: '接続済み', offline: '未起動',
    settingsHint: '音声認識はあなたのパソコン上（faster-whisper）で行われ、音声がクラウドに送られることはありません。',
  },
  onboarding: {
    welcome: '好きなものを聞いて学ぶ', intro: '言語・レベル・好きなトピックを選んでください。後で変更できます。',
    level: '自分のレベル', interests: '興味のあるトピックは？', start: '学習を始める', next: '次へ', back: '戻る',
  },
  settings: {
    title: '設定', profile: '言語とレベル', display: '読み補助', privacy: 'プライバシーとデータ', deleteRecordings: '録音をすべて削除',
    deleteAll: 'アプリをリセット（ローカルデータを全削除）', deleteAllConfirm: '進捗・単語・録音・取り込んだレッスンをすべて削除しますか？',
    privacyText: 'Mimaneはすべてをこの端末（IndexedDB）に保存します。録音がアップロードされたりAIサービスに送られたりすることはありません。',
    about: '情報とクレジット', uiLanguage: '表示言語は「話せる言語」に従います。', done: '完了',
  },
  common: { cancel: 'キャンセル', close: '閉じる', save: '保存', delete: '削除', open: '開く', min: '分', sec: '秒', loading: '読み込み中…', error: 'エラーが発生しました。', seeAll: 'すべて見る', edit: '編集' },
  pos: {
    noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', pronoun: '代名詞', particle: '助詞', conjunction: '接続詞',
    auxiliary: '助動詞', interjection: '感動詞', determiner: '限定詞', preposition: '前置詞', numeral: '数詞', classifier: '類別詞',
    phrase: 'フレーズ', expression: '表現', prefix: '接頭辞', suffix: '接尾辞', symbol: '記号', other: 'その他',
  },
  tone: { ngang: '平声', huyen: '低降', sac: '高昇', hoi: '低降昇', nga: '高昇（喉頭化）', nang: '低短' },
  furigana: { all: 'すべて', rare: '難しい語のみ', off: 'オフ' },
  accent: { 'ja-tokyo': '東京', 'en-us': 'アメリカ', 'en-gb': 'イギリス', 'vi-north': '北部', 'vi-central': '中部', 'vi-south': '南部' },
  reasons: { level: 'レベルに合う', interest: '興味', 'topic-history': 'よく聞くトピック', new: '新着' },
};

const DICTS: Record<SupportLang, DeepPartial<Dict>> = { en, vi, ja };

function lookup(d: unknown, path: string[]): string | undefined {
  let cur = d;
  for (const k of path) {
    if (cur && typeof cur === 'object' && k in cur) cur = (cur as Record<string, unknown>)[k];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(lang: SupportLang): TFn {
  return (key, vars) => {
    const path = key.split('.');
    let s = lookup(DICTS[lang], path) ?? lookup(en, path) ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export function useT(): TFn {
  const lang = useProfile((p) => p.supportLanguage);
  return useMemo(() => makeT(lang), [lang]);
}

/** Pick the best localized string for the UI language. */
export function pick(l: Localized | undefined, lang: SupportLang, fallback = ''): string {
  return l?.[lang] ?? l?.en ?? l?.vi ?? l?.ja ?? fallback;
}
