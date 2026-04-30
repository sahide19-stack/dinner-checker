import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center px-8 text-center bg-orange-50">
      <p className="text-6xl mb-4">🍱</p>
      <h1 className="text-xl font-bold text-gray-800 mb-2">ページが見つかりません</h1>
      <p className="text-sm text-gray-500 mb-8">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 active:scale-95 transition-all"
      >
        カレンダーに戻る
      </Link>
    </div>
  );
}
