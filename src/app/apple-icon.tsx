
import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#3F51B5',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
        }}
      >
        <svg
          width="130"
          height="130"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L21 12L12 22L3 12L12 2Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
