import type { RefObject } from 'react'
import type Konva from 'konva'
import { Group, Layer, Line } from 'react-konva'

import { RELAY_STAGE_SIZE, type RelayRoundArea } from '@/features/relay-drawing/constants'
import type { RelayDrawLine } from '@/features/relay-drawing/types'

import RasterFillImage from './RasterFillImage'

interface DrawingLinesLayerProps {
  lines: RelayDrawLine[]
  drawArea: RelayRoundArea
  activeLineRef: RefObject<Konva.Line | null>
  activeLayerRef: RefObject<Konva.Layer | null>
}

function getLinePoints(line: RelayDrawLine) {
  return line.points.flatMap((point) => [point.x, point.y])
}

export default function DrawingLinesLayer({
  lines,
  drawArea,
  activeLineRef,
  activeLayerRef,
}: DrawingLinesLayerProps) {
  return (
    <>
      {/* 완성된 획 레이어 — Zustand 상태 기반으로 React가 렌더 */}
      <Layer>
        <Group
          clipX={0}
          clipY={drawArea.y}
          clipWidth={RELAY_STAGE_SIZE.width}
          clipHeight={drawArea.height}
        >
          {lines.map((line) => {
            if (line.kind === 'fill') {
              if (line.imageDataUrl) {
                return (
                  <RasterFillImage
                    key={line.id}
                    imageDataUrl={line.imageDataUrl}
                    compositeOperation={line.compositeOperation}
                  />
                )
              }

              return (
                <Line
                  key={line.id}
                  points={getLinePoints(line)}
                  fill={line.color}
                  opacity={line.opacity ?? 1}
                  closed
                  listening={false}
                  globalCompositeOperation={line.compositeOperation ?? 'source-over'}
                />
              )
            }

            return (
              <Line
                key={line.id}
                points={getLinePoints(line)}
                stroke={line.color}
                strokeWidth={line.strokeWidth}
                opacity={line.opacity ?? 1}
                tension={0.45}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.compositeOperation ??
                  (line.color === '#fffdf7' ? 'destination-out' : 'source-over')
                }
              />
            )
          })}
        </Group>
      </Layer>

      {/* 진행 중인 획 레이어 — ref로 명령형 제어, React 리렌더 없음 */}
      <Layer ref={activeLayerRef}>
        <Group
          clipX={0}
          clipY={drawArea.y}
          clipWidth={RELAY_STAGE_SIZE.width}
          clipHeight={drawArea.height}
        >
          <Line
            ref={activeLineRef}
            points={[]}
            tension={0.45}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        </Group>
      </Layer>
    </>
  )
}
