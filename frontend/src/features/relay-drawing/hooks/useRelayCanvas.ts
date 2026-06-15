'use client'

import { useCallback, useRef } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { createBucketFillLine } from '@/shared/utils'
import { RELAY_ROUND_RULES, RELAY_STAGE_SIZE } from '../constants'
import type { RelayDrawLine } from '../types'
import { useRelayDrawingStore } from '../stores'
import { isPointInsideArea } from '../utils/canvas-rendering'

export function useRelayCanvas() {
  const isDrawing = useRef(false)
  const activeStroke = useRef<RelayDrawLine | null>(null)
  const activeLineRef = useRef<Konva.Line>(null)
  const activeLayerRef = useRef<Konva.Layer>(null)

  const beginDrawing = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = event.target.getStage()
      // getPointerPosition()은 Stage scaleX/scaleY를 적용하지 않은 캔버스-CSS-픽셀
      // 좌표를 반환한다. responsive sizing으로 Stage에 scale을 걸어둔 상황에서는
      // 그대로 쓰면 line이 저장된 좌표가 다시 scale로 곱해져 포인터와 다른 위치에
      // 그려진다. getRelativePointerPosition()이 Stage 자체의 transform 역변환을
      // 자동으로 해줘서 children 좌표계의 포인트를 돌려준다.
      const pointerPosition = stage?.getRelativePointerPosition()
      if (!pointerPosition) return

      const {
        activeRoundKey,
        selectedToolKey,
        selectedColor,
        selectedOpacity,
        strokeWidth,
        roundLines,
        addRecentColor,
        commitLine,
      } = useRelayDrawingStore.getState()

      const drawArea = RELAY_ROUND_RULES[activeRoundKey].drawArea
      if (!isPointInsideArea(pointerPosition, drawArea)) return

      if (selectedToolKey === 'bucket') {
        void createBucketFillLine({
          backgroundColor: '#fffdf7',
          boardSize: RELAY_STAGE_SIZE,
          fillColor: selectedColor,
          fillOpacity: selectedOpacity,
          idPrefix: `${activeRoundKey}-fill`,
          lines: roundLines[activeRoundKey],
          pointerPosition,
        }).then((fillLine) => {
          if (!fillLine) return
          const currentStore = useRelayDrawingStore.getState()
          if (currentStore.activeRoundKey !== activeRoundKey) return
          currentStore.commitLine(fillLine)
          currentStore.addRecentColor(selectedColor)
        })
        return
      }

      const stageColor = selectedToolKey === 'eraser' ? '#fffdf7' : selectedColor
      const activeStrokeWidth = strokeWidth
      const compositeOperation =
        selectedToolKey === 'eraser' ? 'destination-out' : 'source-over'
      const opacity = selectedToolKey === 'eraser' ? 1 : selectedOpacity

      isDrawing.current = true
      if (selectedToolKey !== 'eraser') {
        addRecentColor(selectedColor)
      }

      activeStroke.current = {
        id: `${activeRoundKey}-line-${Date.now()}-${roundLines[activeRoundKey].length}`,
        kind: 'stroke',
        color: stageColor,
        strokeWidth: activeStrokeWidth,
        opacity,
        compositeOperation,
        points: [{ x: pointerPosition.x, y: pointerPosition.y }],
      }

      // Konva 노드 속성을 직접 설정하고 레이어를 다시 그린다.
      // React 리렌더 없이 캔버스만 업데이트된다.
      activeLineRef.current?.stroke(stageColor)
      activeLineRef.current?.strokeWidth(activeStrokeWidth)
      activeLineRef.current?.opacity(opacity)
      activeLineRef.current?.points([pointerPosition.x, pointerPosition.y])
      activeLayerRef.current?.batchDraw()
    },
    [],
  )

  const flushActiveStroke = useCallback(() => {
    if (!activeStroke.current) return

    const { commitLine } = useRelayDrawingStore.getState()
    commitLine(activeStroke.current)
    activeLineRef.current?.points([])
    activeLayerRef.current?.batchDraw()
    activeStroke.current = null
  }, [])

  const continueDrawing = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isDrawing.current || !activeStroke.current) return

      const stage = event.target.getStage()
      // getRelativePointerPosition: Stage scale이 걸린 상황에서도 children 좌표계
      // 의 포인트를 돌려준다 (beginDrawing 주석 참조).
      const pointerPosition = stage?.getRelativePointerPosition()
      if (!pointerPosition) return

      const { activeRoundKey } = useRelayDrawingStore.getState()
      const drawArea = RELAY_ROUND_RULES[activeRoundKey].drawArea

      if (!isPointInsideArea(pointerPosition, drawArea)) {
        isDrawing.current = false
        flushActiveStroke()
        return
      }

      // ref에 점을 추가한다 — Zustand 업데이트 없음, 리렌더 없음
      activeStroke.current.points.push({ x: pointerPosition.x, y: pointerPosition.y })

      // Konva 캔버스를 직접 업데이트한다.
      const flatPoints = activeStroke.current.points.flatMap((p) => [p.x, p.y])
      activeLineRef.current?.points(flatPoints)
      activeLayerRef.current?.batchDraw()
    },
    [flushActiveStroke],
  )

  const endDrawing = useCallback(() => {
    isDrawing.current = false
    flushActiveStroke()
  }, [flushActiveStroke])

  return { beginDrawing, continueDrawing, endDrawing, activeLineRef, activeLayerRef }
}
