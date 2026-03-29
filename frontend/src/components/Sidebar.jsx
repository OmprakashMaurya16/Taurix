import { LayoutDashboard, PieChart, LineChart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function Sidebar() {
    const location = useLocation();
    
    return (
        <div className="w-64 bg-[#0a0d14] border-r border-[#1e232b] flex flex-col justify-between hidden md:flex h-screen sticky top-0">
            <div>
                <div className="p-6">
                    <h1 className="text-2xl font-bold flex items-center">
                        <span className="text-[#00e5ff]">AI</span>
                        <span className="text-[#00e5ff] ml-1">Invest</span>
                    </h1>
                </div>

                <div className="px-6 py-4">
                    <p className="text-[#454e5b] text-[10px] font-bold tracking-widest uppercase mb-1">The Quant's Atelier</p>
                    <p className="text-[#454e5b] text-[10px] font-bold tracking-widest uppercase mb-4">AI Decision Layer</p>
                </div>

                <ul className="space-y-1 mt-2">
                    <li>
                        <Link to="/" className={`flex items-center px-6 py-3 font-medium text-sm transition-colors ${location.pathname === '/' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.05)] border-l-2 border-[#00e5ff]' : 'text-[#687383] border-l-2 border-transparent hover:text-gray-300'}`}>
                            <LayoutDashboard className="w-4 h-4 mr-3" />
                            DASHBOARD
                        </Link>
                    </li>
                    <li>
                        <Link to="/portfolio" className={`flex items-center px-6 py-3 font-medium text-sm transition-colors ${location.pathname === '/portfolio' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.05)] border-l-2 border-[#00e5ff]' : 'text-[#687383] border-l-2 border-transparent hover:text-gray-300'}`}>
                            <PieChart className="w-4 h-4 mr-3" />
                            PORTFOLIO
                        </Link>
                    </li>
                    <li>
                        <Link to="/insights" className={`flex items-center px-6 py-3 font-medium text-sm transition-colors ${location.pathname === '/insights' ? 'text-[#00e5ff] bg-[rgba(0,229,255,0.05)] border-l-2 border-[#00e5ff]' : 'text-[#687383] border-l-2 border-transparent hover:text-gray-300'}`}>
                            <LineChart className="w-4 h-4 mr-3" />
                            INSIGHTS
                        </Link>
                    </li>
                </ul>
            </div>

            <div className="p-6">
                <div className="bg-[#11161d] p-4 rounded-lg border border-[#1e232b]">
                    <p className="text-[#687383] text-xs font-semibold mb-2">SYSTEM STATUS</p>
                    <div className="flex items-center text-[#00e5ff] text-sm">
                        <div className="w-2 h-2 bg-[#00ffcc] rounded-full mr-2 shadow-[0_0_8px_#00ffcc]"></div>
                        Neural Core Online
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;