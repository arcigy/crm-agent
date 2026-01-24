import { ToolGuard } from '@/components/auth/ToolGuard';

export default function DummyToolPage() {
  return (
    <ToolGuard toolId="dummy-tool">
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">Dummy Tool</h1>
        <div className="p-6 bg-white rounded-lg shadow">
          <p className="text-lg mb-4">Welcome to the dummy tool!</p>
          <p className="text-gray-600">
            If you can see this, it means you have successfully purchased access (or have a trial).
            The ToolGuard component is working correctly.
          </p>
        </div>
      </div>
    </ToolGuard>
  );
}
