import SingleChoice from './AnswerInputs/SingleChoice'
import MultipleChoice from './AnswerInputs/MultipleChoice'
import NumericInput from './AnswerInputs/NumericInput'
import TextInput from './AnswerInputs/TextInput'

export default function ItemCard({ item, value, onChange }: any) {
  return (
    <div className="rounded-xl border p-4 mb-4">
      <div className="mb-2 text-sm text-gray-500">{item.unit} · {(item.kcs||[]).join(' / ')}</div>
      <div className="mb-3 whitespace-pre-wrap">{item.stem}</div>
      {item.item_type === 'single' && <SingleChoice choices={item.choices} value={value} onChange={onChange} />}
      {item.item_type === 'multiple' && <MultipleChoice choices={item.choices} value={value} onChange={onChange} />}
      {item.item_type === 'numeric' && <NumericInput value={value} onChange={onChange} />}
      {item.item_type === 'text' && <TextInput value={value} onChange={onChange} />}
      {!( ['single','multiple','numeric','text'].includes(item.item_type) ) && (
        <TextInput value={value} onChange={onChange} placeholder={`目前未實作 ${item.item_type}，可先用文字描述作答`} />
      )}
    </div>
  )
}