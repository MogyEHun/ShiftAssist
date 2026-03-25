import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  _req: NextRequest,
  { params }: { params: { size: string } }
) {
  const size = parseInt(params.size) || 192
  const validSizes = [192, 512]
  const iconSize = validSizes.includes(size) ? size : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: iconSize,
          height: iconSize,
          background: 'linear-gradient(135deg, #1a5c3a 0%, #0f3d26 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: iconSize * 0.2,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: iconSize * 0.04,
          }}
        >
          {/* Naptár ikon SVG-szerűen */}
          <div
            style={{
              width: iconSize * 0.55,
              height: iconSize * 0.5,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: iconSize * 0.06,
              border: `${iconSize * 0.025}px solid rgba(255,255,255,0.6)`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Fejléc sáv */}
            <div
              style={{
                height: iconSize * 0.12,
                background: '#d4a017',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
            {/* Rács */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                padding: iconSize * 0.02,
                gap: iconSize * 0.02,
              }}
            >
              {[0, 1, 2].map((col) => (
                <div
                  key={col}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: iconSize * 0.02,
                  }}
                >
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      style={{
                        flex: 1,
                        background:
                          col === 1 && row === 1
                            ? 'rgba(212,160,23,0.7)'
                            : 'rgba(255,255,255,0.2)',
                        borderRadius: iconSize * 0.02,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* "SS" szöveg */}
          <div
            style={{
              color: 'white',
              fontSize: iconSize * 0.14,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              fontFamily: 'sans-serif',
            }}
          >
            ShiftAssist
          </div>
        </div>
      </div>
    ),
    { width: iconSize, height: iconSize }
  )
}
