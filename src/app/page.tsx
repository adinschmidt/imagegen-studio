import { Header } from "@/components/header";
import { ImageGenerator } from "@/components/image-generator";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-[1600px] px-4 py-6">
        <ImageGenerator />
      </main>
    </div>
  );
}
