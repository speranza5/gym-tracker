export function DayTabs({ days, activeDayId, onSelect }) {
  return (
    <div className="day-tabs" role="tablist">
      {days.map((day) => (
        <button
          key={day.id}
          type="button"
          role="tab"
          aria-selected={day.id === activeDayId}
          className={`day-tabs__tab ${day.id === activeDayId ? 'is-active' : ''}`}
          onClick={() => onSelect(day.id)}
        >
          {day.name}
        </button>
      ))}
    </div>
  )
}
