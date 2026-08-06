import Image from 'next/image'

export function CindelBrand() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/new_logo-removebg-preview-M56wuRQ1qh1E0XNJv9s6nlTGWgJ46K.png"
        alt="Cindel logo"
        width={200}
        height={80}
        priority
        className="h-auto w-full max-w-xs"
      />
    </div>
  )
}
