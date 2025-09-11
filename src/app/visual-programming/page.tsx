"use client";
import React from 'react'
import { Button } from '@/components/ui/button'

type Node = { id: string; x: number; y: number; label: string }

export default function VisualProgrammingPage() {
  const [nodes, setNodes] = React.useState<Node[]>([
    { id: '1', x: 40, y: 40, label: 'Input' },
    { id: '2', x: 260, y: 120, label: 'Process' },
    { id: '3', x: 520, y: 40, label: 'Output' },
  ])

  const [edges, setEdges] = React.useState<{ from: string; to: string }[]>([
    { from: '1', to: '2' },
    { from: '2', to: '3' },
  ])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const dragNode = React.useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  function onMouseDownNode(e: React.MouseEvent, node: Node) {
    dragNode.current = { id: node.id, offsetX: e.clientX - node.x, offsetY: e.clientY - node.y }
  }

  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragNode.current) return
      setNodes((prev) =>
        prev.map((n) => (n.id === dragNode.current!.id ? { ...n, x: e.clientX - dragNode.current!.offsetX, y: e.clientY - dragNode.current!.offsetY } : n))
      )
    }
    function onMouseUp() {
      dragNode.current = null
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function addNode() {
    const id = String(Date.now())
    setNodes((n) => [...n, { id, x: 120, y: 120, label: 'Node' }])
  }

  function connectSelectedTo(targetId: string) {
    if (!selectedId) return
    setEdges((e) => [...e, { from: selectedId!, to: targetId }])
  }

  function updateLabel(id: string, label: string) {
    setNodes((n) => n.map((x) => (x.id === id ? { ...x, label } : x)))
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl mb-4">Visual Programming (Simple)</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 border rounded-lg p-2 relative h-[70vh] bg-white">
          <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {edges.map((edge, idx) => {
              const from = nodes.find((n) => n.id === edge.from)
              const to = nodes.find((n) => n.id === edge.to)
              if (!from || !to) return null
              const x1 = from.x + 80
              const y1 = from.y + 20
              const x2 = to.x
              const y2 = to.y + 20
              const midx = (x1 + x2) / 2
              return <path key={idx} d={`M ${x1} ${y1} C ${midx} ${y1}, ${midx} ${y2}, ${x2} ${y2}`} stroke="#0ea5e9" strokeWidth={2} fill="none" />
            })}
          </svg>

          {nodes.map((n) => (
            <div
              key={n.id}
              style={{ left: n.x, top: n.y }}
              onMouseDown={(e) => onMouseDownNode(e, n)}
              onClick={() => setSelectedId(n.id)}
              className={`absolute w-40 p-2 border rounded ${selectedId === n.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex justify-between items-center">
                <div className="font-medium">{n.label}</div>
                <button className="text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); connectSelectedTo(n.id) }}>Link</button>
              </div>
            </div>
          ))}

          <div className="absolute bottom-3 left-3 flex space-x-2">
            <Button onClick={addNode}>Add Node</Button>
          </div>
        </div>

        <div className="col-span-1">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Properties</h2>
            {selectedId ? (
              (() => {
                const node = nodes.find((n) => n.id === selectedId)!
                return (
                  <div className="space-y-2">
                    <div>Node ID: {node.id}</div>
                    <label className="block">Label
                      <input className="w-full mt-1" value={node.label} onChange={(e) => updateLabel(node.id, e.target.value)} />
                    </label>
                    <div>Position: {Math.round(node.x)},{Math.round(node.y)}</div>
                    <div className="mt-2">Connect to</div>
                    <div className="space-y-1">
                      {nodes.filter((n) => n.id !== node.id).map((o) => (
                        <div key={o.id} className="flex items-center justify-between">
                          <div>{o.label}</div>
                          <button onClick={() => setEdges((e) => [...e, { from: node.id, to: o.id }])} className="text-sm text-primary">Connect</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : (
              <div>Click a node on the canvas to edit.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
