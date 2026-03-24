export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">XCLSV Process Hub</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Centralized knowledge management for operational processes
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="/processes"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Browse Processes →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              View and search all documented processes
            </p>
          </a>
          
          <a
            href="/login"
            className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Sign In →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Login to create and edit processes
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
