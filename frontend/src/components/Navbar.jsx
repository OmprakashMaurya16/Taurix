import { Search, Bell, UserCircle } from "lucide-react";

function Navbar() {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center px-4 md:px-8 py-4 gap-4 sm:gap-0 border-b border-[#1e232b] bg-[#0d1117] sticky top-0 z-10 w-full">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#687383]" />
                <input
                    type="text"
                    placeholder="Search TCS, HDFC Bank..."
                    className="bg-[#11161d] border border-[#1e232b] text-gray-300 text-sm px-10 py-2.5 rounded-lg w-full outline-none focus:border-[#00e5ff] transition-colors placeholder-[#687383]"
                />
            </div>

            <div className="flex items-center gap-5 text-[#687383] w-full sm:w-auto justify-center sm:justify-end">
                <button className="hover:text-white transition-colors">
                    <Bell className="w-5 h-5" />
                </button>
                <button className="hover:text-white transition-colors">
                    <UserCircle className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
}

export default Navbar;