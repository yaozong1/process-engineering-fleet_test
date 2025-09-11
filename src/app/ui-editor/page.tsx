"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type ComponentType = 'Button' | 'Card' | 'Badge'

type Instance = {
  id: string
  type: ComponentType
  x: number
  y: number
  props: Record<string, any>
}

const library: ComponentType[] = ['Button', 'Card', 'Badge']

function downloadJSON(obj: any, filename = 'ui-layout.json'){
  const data = JSON.stringify(obj, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function UIEditorPage(){
  const [instances, setInstances] = React.useState<Instance[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const dragRef = React.useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  // add from library
  function addComponent(type: ComponentType){
    const id = String(Date.now())
    const defaultProps = type === 'Button' ? { label: 'Button', variant: 'default', size: 'default' } : type === 'Badge' ? { label: 'Badge', variant: 'default' } : { title: 'Card title', content: 'Card content' }
    setInstances(i=>[...i, { id, type, x: 60, y: 60, props: defaultProps }])
    setSelectedId(id)
  }

  function onMouseDownInstance(e: React.MouseEvent, inst: Instance){
    dragRef.current = { id: inst.id, offsetX: e.clientX - inst.x, offsetY: e.clientY - inst.y }
    e.stopPropagation()
  }

  React.useEffect(()=>{
    function onMove(e: MouseEvent){
      if(!dragRef.current) return
      setInstances(prev => prev.map(it => it.id === dragRef.current!.id ? { ...it, x: e.clientX - dragRef.current!.offsetX, y: e.clientY - dragRef.current!.offsetY } : it))
    }
    function onUp(){ dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  function updateProps(id: string, props: Record<string, any>){
    setInstances(prev => prev.map(it => it.id === id ? { ...it, props: { ...it.props, ...props } } : it))
  }

  function removeInstance(id:string){
    setInstances(prev=> prev.filter(i=> i.id!==id))
    if(selectedId === id) setSelectedId(null)
  }

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl mb-4">Visual UI Editor (Integrated)</h1>
      <div className="grid grid-cols-4 gap-6">
        <aside className="col-span-1">
          <Card className="p-4 space-y-3">
            <CardHeader>
              <CardTitle>Library</CardTitle>
            </CardHeader>
            <CardContent>
              {library.map((l) => (
                <button key={l} onClick={() => addComponent(l)} className="w-full text-left rounded-md px-3 py-2 bg-card hover:bg-accent">
                  {l}
                </button>
              ))}
              <div className="mt-3 flex space-x-2">
                <Button onClick={() => downloadJSON(instances)}>Export JSON</Button>
                <Button variant="outline" onClick={() => setInstances([])}>Clear</Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        <main className="col-span-2">
          <div className="border rounded-lg p-2 relative h-[70vh] bg-white" onClick={() => setSelectedId(null)}>
            {instances.map((it) => (
              <div key={it.id} style={{ left: it.x, top: it.y }} onMouseDown={(e) => onMouseDownInstance(e, it)} onClick={(e) => { e.stopPropagation(); setSelectedId(it.id) }} className={`absolute cursor-move`}>
                {it.type === 'Button' && (
                  <Button variant={it.props.variant} size={it.props.size}>{it.props.label}</Button>
                )}
                {it.type === 'Badge' && (
                  <Badge variant={it.props.variant}>{it.props.label}</Badge>
                )}
                {it.type === 'Card' && (
                  <Card className="w-64">
                    <CardHeader>
                      <CardTitle>{it.props.title}</CardTitle>
                    </CardHeader>
                    <CardContent>{it.props.content}</CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </main>

        <section className="col-span-1">
          <Card className="p-4">
            <CardHeader>
              <CardTitle>Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedId ? (() => {
                const inst = instances.find((i) => i.id === selectedId)!
                if (!inst) return <div>Instance not found</div>
                if (inst.type === 'Button') {
                  return (
                    <div className="space-y-3">
                      <label className="block">Label
                        <input className="mt-1 w-full" value={inst.props.label} onChange={e => updateProps(inst.id, { label: e.target.value })} />
                      </label>
                      <label className="block">Variant
                        <select value={inst.props.variant} onChange={e => updateProps(inst.id, { variant: e.target.value })} className="mt-1 w-full">
                          <option value="default">default</option>
                          <option value="destructive">destructive</option>
                          <option value="outline">outline</option>
                          <option value="secondary">secondary</option>
                          <option value="ghost">ghost</option>
                          <option value="link">link</option>
                        </select>
                      </label>
                      <label className="block">Size
                        <select value={inst.props.size} onChange={e => updateProps(inst.id, { size: e.target.value })} className="mt-1 w-full">
                          <option value="default">default</option>
                          <option value="sm">sm</option>
                          <option value="lg">lg</option>
                          <option value="icon">icon</option>
                        </select>
                      </label>
                      <div className="flex space-x-2">
                        <Button variant="destructive" onClick={() => removeInstance(inst.id)}>Remove</Button>
                      </div>
                    </div>
                  )
                }

                if (inst.type === 'Badge') {
                  return (
                    <div className="space-y-3">
                      <label className="block">Label
                        <input className="mt-1 w-full" value={inst.props.label} onChange={e => updateProps(inst.id, { label: e.target.value })} />
                      </label>
                      <label className="block">Variant
                        <select value={inst.props.variant} onChange={e => updateProps(inst.id, { variant: e.target.value })} className="mt-1 w-full">
                          <option value="default">default</option>
                          <option value="secondary">secondary</option>
                          <option value="destructive">destructive</option>
                          <option value="outline">outline</option>
                        </select>
                      </label>
                      <div className="flex space-x-2">
                        <Button variant="destructive" onClick={() => removeInstance(inst.id)}>Remove</Button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="space-y-3">
                    <label className="block">Title
                      <input className="mt-1 w-full" value={inst.props.title} onChange={e => updateProps(inst.id, { title: e.target.value })} />
                    </label>
                    <label className="block">Content
                      <textarea className="mt-1 w-full" value={inst.props.content} onChange={e => updateProps(inst.id, { content: e.target.value })} />
                    </label>
                    <div className="flex space-x-2">
                      <Button variant="destructive" onClick={() => removeInstance(inst.id)}>Remove</Button>
                    </div>
                  </div>
                )
              })() : (
                <div>Click a canvas item to edit properties, or add components from the left.</div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
