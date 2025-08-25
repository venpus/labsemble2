import React, { useState, useRef } from 'react';
import { Package, Upload, X, Play, Image as ImageIcon, Video } from 'lucide-react';

const ProdInfo = ({ project }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    if (uploadedFiles.length + files.length > 10) {
      alert('최대 10개까지만 업로드할 수 있습니다.');
      return;
    }

    const newFiles = files.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const isImage = (file) => {
    return file.type.startsWith('image/');
  };

  const isVideo = (file) => {
    return file.type.startsWith('video/');
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <Package className="w-5 h-5 mr-2 text-orange-600" />
        제품정보
      </h2>
      
      {/* 제품정보 테이블 */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
          <tbody className="bg-white divide-y divide-gray-200">
            <tr className="hover:bg-gray-50">
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-blue-600"></div>
                  1개 무게
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {project.unit_weight ? `${project.unit_weight}g` : '-'}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-green-600"></div>
                  소포장 방식
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {project.packaging_method || '-'}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-yellow-600"></div>
                  박스 크기
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200" style={{width: '12.5%'}}>
                {project.box_dimensions ? `${project.box_dimensions} cm` : '-'}
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200" style={{width: '12.5%'}}>
                <div className="flex items-center">
                  <div className="w-4 h-4 mr-2 rounded-full bg-purple-600"></div>
                  박스 무게
                </div>
              </td>
              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900" style={{width: '12.5%'}}>
                {project.box_weight ? `${project.box_weight}g` : '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 제품 이미지/동영상 업로드 섹션 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
            제품 이미지/동영상
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {uploadedFiles.length}/10
            </span>
            <button
              onClick={handleUploadClick}
              disabled={uploadedFiles.length >= 10 || isUploading}
              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              업로드
            </button>
          </div>
        </div>

        {/* 파일 업로드 안내 */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            • 최대 10개까지 이미지와 동영상을 업로드할 수 있습니다.<br/>
            • 파일 크기 제한은 없습니다.<br/>
            • 지원 형식: JPG, PNG, GIF, MP4, MOV, AVI 등
          </p>
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* 업로드된 파일 썸네일 */}
        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="relative group">
                <div className="relative">
                  {file.type === 'image' ? (
                    <img
                      src={file.preview}
                      alt="제품 이미지"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center relative">
                      <video
                        src={file.preview}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}
                  
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                
                {/* 파일 정보 */}
                <div className="mt-2 text-center">
                  <p className="text-xs text-gray-600 truncate">
                    {file.file.name}
                  </p>
                  <div className="flex items-center justify-center mt-1">
                    {file.type === 'image' ? (
                      <ImageIcon className="w-3 h-3 text-blue-500 mr-1" />
                    ) : (
                      <Video className="w-3 h-3 text-purple-500 mr-1" />
                    )}
                    <span className="text-xs text-gray-500">
                      {file.type === 'image' ? '이미지' : '동영상'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 업로드 안내 (파일이 없을 때) */}
        {uploadedFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">업로드 버튼을 클릭하여 제품 이미지나 동영상을 추가하세요</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProdInfo; 