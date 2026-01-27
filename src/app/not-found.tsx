import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-800">
            <h2 className="text-4xl font-black mb-4">404 - Stránka nenájdená</h2>
            <p className="mb-6 text-gray-600">Ľutujeme, ale požadovaná stránka neexistuje.</p>
            <Link
                href="/"
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
                Späť na domovskú obrazovku
            </Link>
        </div>
    )
}
