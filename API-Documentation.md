# 视觉检测系统 API 接口文档

## 概述

这是一个基于 FastAPI 的视觉检测系统，支持实时图像处理、形状识别、OCR文字识别和物理测量功能。

## 基础信息

- **基础URL**: `http://localhost:8000`
- **支持协议**: HTTP/HTTPS, WebSocket
- **返回格式**: JSON

---

## 1. 视频流接口

### 1.1 获取处理后的视频流

```http
GET /video/processed
```

**说明**: 获取带标注的处理后视频流  
**返回**: MJPEG视频流  
**用途**: 实时显示检测结果

### 1.2 获取掩码视频流

```http
GET /video/mask
```

**说明**: 获取二值化掩码视频流  
**返回**: MJPEG视频流  
**用途**: 调试图像处理效果

### 1.3 获取分水岭处理视频流

```http
GET /video/watershed_img
```

**说明**: 获取分水岭算法处理后的视频流  
**返回**: MJPEG视频流  
**用途**: 调试形状分离效果

---

## 2. 参数控制接口

### 2.1 设置HSV颜色空间参数

```http
POST /control/hsv
```

**请求体**:

```json
{
  "h1_min": 0,
  "h1_max": 179,
  "s1_min": 0,
  "s1_max": 255,
  "v1_min": 0,
  "v1_max": 85,
  "h2_min": 0,
  "h2_max": 179,
  "s2_min": 0,
  "s2_max": 255,
  "v2_min": 0,
  "v2_max": 85,
  "use_range2": false,
  "min_area": 200
}
```

**返回示例**:

```json
{
  "params": {
    "h1_min": 0,
    "h1_max": 179,
    "s1_min": 0,
    "s1_max": 255,
    "v1_min": 0,
    "v1_max": 85,
    "h2_min": 0,
    "h2_max": 179,
    "s2_min": 0,
    "s2_max": 255,
    "v2_min": 0,
    "v2_max": 85,
    "use_range2": false,
    "min_area": 200,
    "canny_min": 50,
    "canny_max": 150
  }
}
```

**参数说明**:

- `h1_min/h1_max`: 色调范围1 (0-179)
- `s1_min/s1_max`: 饱和度范围1 (0-255)
- `v1_min/v1_max`: 明度范围1 (0-255)
- `h2_min/h2_max`: 色调范围2 (0-179)
- `s2_min/s2_max`: 饱和度范围2 (0-255)
- `v2_min/v2_max`: 明度范围2 (0-255)
- `use_range2`: 是否启用第二个HSV范围
- `min_area`: 最小检测面积

### 2.2 设置Canny边缘检测参数

```http
POST /control/canny
```

**请求体**:

```json
{
  "canny_min": 50,
  "canny_max": 150
}
```

**返回示例**:

```json
{
  "params": {
    "canny_min": 50,
    "canny_max": 150,
    "h1_min": 0,
    "h1_max": 179,
    "s1_min": 0,
    "s1_max": 255,
    "v1_min": 0,
    "v1_max": 85,
    "use_range2": false,
    "min_area": 200
  }
}
```

**参数说明**:

- `canny_min`: Canny算法低阈值 (通常20-100)
- `canny_max`: Canny算法高阈值 (通常50-200)

---

## 3. 配置管理接口

### 3.1 获取当前配置

```http
GET /config
```

**返回示例**:

```json
{
  "detection_params": {
    "h1_min": 0,
    "h1_max": 179,
    "s1_min": 0,
    "s1_max": 255,
    "v1_min": 0,
    "v1_max": 85,
    "h2_min": 0,
    "h2_max": 179,
    "s2_min": 0,
    "s2_max": 255,
    "v2_min": 0,
    "v2_max": 85,
    "use_range2": false,
    "min_area": 200,
    "canny_min": 50,
    "canny_max": 150,
    "enable_ocr": true
  },
  "area_filter_params": {
    "min_crop_area": 500000,
    "max_crop_area": 19000000,
    "enable_area_filter": true,
    "a4_ratio_tolerance": 0.3,
    "max_circularity": 0.7,
    "min_solidity": 0.8,
    "max_vertices": 8,
    "enable_a4_check": true
  },
  "perspective_params": {
    "enable": true,
    "target_width": 210,
    "target_height": 297,
    "a4_ratio": 1.414285714285714,
    "use_short_edge_for_measurement": true
  },
  "black_detection_params": {
    "lower_h": 0,
    "lower_s": 0,
    "lower_v": 0,
    "upper_h": 255,
    "upper_s": 255,
    "upper_v": 80,
    "morph_kernel_size": 3
  },
  "camera_params": {
    "index": 1,
    "width": 1920,
    "height": 1080
  }
}
```

### 3.2 更新检测参数

```http
POST /config/detection
```

### 3.3 更新面积过滤参数

```http
POST /config/area_filter
```

### 3.4 更新梯形校正参数

```http
POST /config/perspective
```

### 3.5 更新黑色检测参数

```http
POST /config/black_detection
```

### 3.6 更新摄像头参数

```http
POST /config/camera
```

### 3.7 保存自定义配置

```http
POST /config/custom_string
```

### 3.8 获取自定义配置

```http
GET /config/custom_string
```

---

## 4. OCR识别接口

### 4.1 OCR文字识别

```http
GET /ocr
```

### 4.2 OCR和物理测量分析

```http
GET /api/ocr_measurement_analysis
```

---

## 5. 形状检测接口

### 5.1 获取最小正方形信息

```http
GET /api/minimum_square
```

### 5.2 获取内框信息

```http
GET /api/inner_rectangles
```

---

## 6. 物理测量接口

### 6.1 获取所有物理测量数据

```http
GET /api/physical_measurements
```

### 6.2 获取指定crop的物理测量数据

```http
GET /api/physical_measurements/{crop_index}
```

---

## 7. WebSocket实时数据

### 7.1 WebSocket连接

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
```
