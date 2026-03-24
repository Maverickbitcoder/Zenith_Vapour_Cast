export default function Working(){
    return(
    <div className="h-full w-full flex items-start justify-center p-4">
      <div className="flex flex-col items-center justify-center">
        {/* Top row of boxes */}
        <div className="flex items-center justify-center space-x-4 md:space-x-8 lg:space-x-12 mb-8">
          {/* Box 1 */}
          <div className="text-center">
            <div className="h-[150px] w-[254px] rounded bg-blue-1/10 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="text-[154%] text-grey-5 font-bold">GNSS Signal</div>
              <div className="text-[154%] text-blue-1 font-bold">Reception</div>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="text-grey-4 text-[154%]">→</div>
          
          {/* Box 2 */}
          <div className="text-center">
            <div className="h-[150px] w-[254px] rounded bg-blue-1/10 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="text-[154%] text-grey-5 font-bold">RINEX Data</div>
              <div className="text-[154%] text-blue-1 font-bold">Processing</div>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="text-grey-4 text-[154%]">→</div>
          
          {/* Box 3 */}
          <div className="text-center">
            <div className="h-[150px] w-[254px] rounded bg-blue-1/10 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="text-[154%] text-grey-5 font-bold">ZWD + Features</div>
              <div className="text-[154%] text-blue-1 font-bold">Engineering</div>
            </div>
          </div>
          
          {/* Arrow */}
          <div className="text-grey-4 text-[154%]">→</div>
          
          {/* Box 4 */}
          <div className="text-center">
            <div className="h-[150px] w-[254px] rounded bg-blue-1/10 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="text-[154%] text-grey-5 font-bold">ML Models</div>
              <div className="text-[154%] text-blue-1 font-bold">Prediction</div>
            </div>
          </div>
        </div>
        
        {/* Down arrow */}
        <div className="text-grey-4 text-[154%] mb-[20px]">↓</div>
        
        {/* Bottom box */}
        <div className="text-center">
          <div className="h-[150px] w-[254px] rounded bg-blue-1/10 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="text-[154%] text-grey-5 font-bold">Dashboard</div>
            <div className="text-[154%] text-blue-1 font-bold">Visualization</div>
          </div>
        </div>
      </div>
    </div>
    )
}