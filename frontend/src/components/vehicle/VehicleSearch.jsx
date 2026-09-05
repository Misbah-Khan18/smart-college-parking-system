import { SearchIcon, XIcon } from '../Icons'

export default function VehicleSearch({
  searchQuery = '',
  onSearchChange,
  placeholder = 'Search by student, roll no, or plate...',
  className = ''
}) {
  const handleInput = (e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value)
    }
  }

  const handleClear = () => {
    if (onSearchChange) {
      onSearchChange('')
    }
  }

  return (
    <div className={`table-search-box ${className}`}>
      <SearchIcon className="w-4 h-4 search-icon-svg" />
      <input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInput}
        className="table-search-input"
        aria-label="Search vehicles"
      />
      {searchQuery && (
        <button
          type="button"
          className="clear-search-btn"
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search query"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
