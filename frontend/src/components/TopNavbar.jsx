import { Search, Bell, UserCircle, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

function TopNavbar({
  searchValue = "",
  onSearchChange = () => {},
  onSearchSubmit = () => {},
  searchPlaceholder = "Search markets...",
}) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (searchValue.trim()) {
      onSearchSubmit(searchValue.trim());
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between px-4 lg:px-8 py-4 border-b border-[#1e232b] bg-[#0d1117] sticky top-0 z-50 w-full">
      <div className="flex justify-between items-center w-full lg:w-auto">
        <Link
          to="/"
          className="text-xl font-bold flex items-center gap-3 cursor-pointer">
          <img
            src="/logo.png"
            alt="Taurix"
            className="h-9 w-9 lg:h-9 lg:w-11 rounded-full object-cover "
          />
          <span className="text-[#00e5ff]">Taurix</span>
        </Link>

        <button
          className="lg:hidden text-[#8b949e] hover:text-white p-2 -mr-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Desktop and Mobile Menu Items */}
      <div
        className={`${isMenuOpen ? "flex" : "hidden"} lg:flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12 w-full lg:w-auto mt-6 lg:mt-0 pb-2 lg:pb-0`}>
        <nav className="flex flex-col lg:flex-row gap-4 lg:gap-8 text-sm font-semibold w-full lg:w-auto">
          <Link
            to="/"
            className={`${location.pathname === "/" ? "text-white" : "text-[#8b949e] hover:text-gray-300"} transition-colors py-2 lg:py-0`}
            onClick={() => setIsMenuOpen(false)}>
            Dashboard
          </Link>
          <Link
            to="/portfolio"
            className={`${location.pathname === "/portfolio" ? "text-[#00e5ff]" : "text-[#8b949e] hover:text-gray-300"} transition-colors py-2 lg:py-0`}
            onClick={() => setIsMenuOpen(false)}>
            Portfolio
          </Link>
          <Link
            to="/insights"
            className={`${location.pathname === "/insights" ? "text-white" : "text-[#8b949e] hover:text-gray-300"} transition-colors py-2 lg:py-0`}
            onClick={() => setIsMenuOpen(false)}>
            Intelligence
          </Link>
        </nav>

        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 w-full lg:w-auto border-t lg:border-t-0 border-[#1e232b] pt-6 lg:pt-0">
          <form className="relative w-full lg:w-72" onSubmit={handleSubmit}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="bg-[#11161d] border border-[#21262d] text-gray-300 text-sm px-10 py-2 rounded-lg w-full outline-none focus:border-[#00e5ff] transition-colors placeholder-[#8b949e]"
            />
          </form>

          <div className="flex items-center gap-5 text-[#8b949e] w-full lg:w-auto justify-end sm:justify-start">
            <button className="hover:text-white transition-colors p-2 lg:p-0">
              <Bell className="w-5 h-5" />
            </button>
            <button className="hover:text-white transition-colors p-2 lg:p-0">
              <UserCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopNavbar;
