# 🎮 DrawGuess - 하이브리드 클라우드 GitOps 인프라 프로젝트

> **라즈베리파이 Kubernetes 클러스터와 AWS 클라우드를 Tailscale VPN으로 연결한 하이브리드 클라우드 환경에서 GitOps 기반 자동 배포 시스템을 구축하고 Socket.IO 실시간 멀티플레이어 기능을 개발 중인 DevOps 인프라 프로젝트**

[![Infrastructure Demo](https://img.shields.io/badge/%F0%9F%8F%97%EF%B8%8F_Infrastructure_Demo-hwara--dev.kr-blue?style=for-the-badge)](https://hwara-dev.kr/) ![GitOps](https://img.shields.io/badge/%F0%9F%9A%80_GitOps-ArgoCD_Self--Healing-green?style=for-the-badge) ![Architecture](https://img.shields.io/badge/%F0%9F%8F%97%EF%B8%8F_Architecture-Hybrid_Cloud-orange?style=for-the-badge)

---

## 🏆 **핵심 기술 성과**

|🎯 **특징**|📊 **성과**|🔧 **기술 스택**|
|---|---|---|
|**하이브리드 클라우드 설계**|실시간(Edge) + 영구(Cloud) 분산|라즈베리파이 K8s + AWS RDS|
|**완전 자동화 GitOps**|Git Push → 3분내 자동배포|ArgoCD + Self-Healing|
|**멀티 아키텍처 지원**|AMD64 + ARM64 동시 빌드|Docker Buildx + Private Registry|
|**엣지 컴퓨팅 최적화**|4GB RAM에서 7개 서비스 운영|Resource Tuning + K8s 최적화|
|**실시간 통신 기반**|Socket.IO 멀티플레이어 아키텍처|WebSocket + Redis Pub/Sub|

---

## 🎮 **현재 구현 상태 & 시연**

### **🌐 운영 중인 인프라**

- **웹사이트**: [https://hwara-dev.kr](https://hwara-dev.kr/)
- **게임 API**: [https://api.hwara-dev.kr/health](https://api.hwara-dev.kr/health)
- **시스템 상태**: [https://api.hwara-dev.kr/api/status](https://api.hwara-dev.kr/api/status)

### **📊 실시간 모니터링 대시보드**

- **Grafana**: http://172.30.1.104 (VPN 접근)
- **ArgoCD**: http://172.30.1.105 (GitOps 대시보드)

### **✅ 현재 구현 완료**

- 🏗️ **하이브리드 클라우드 인프라**: Terraform AWS IaC + 라즈베리파이 K8s + Tailscale VPN
- 🚀 **GitOps 자동 배포**: ArgoCD + Self-Healing + GitHub Actions CI/CD
- 🤖 **Self-hosted Runner**: 라즈베리파이 기반 Private Registry 직접 접근
- 📊 **통합 모니터링**: Prometheus + Grafana + 시스템 메트릭
- 🔧 **멀티플레이어 기반**: Socket.IO 실시간 채팅 시스템 (방 생성/입장, 채팅, 사용자 관리)

### **🔄 개발 진행 중**

- 🎨 **그림 그리기 기능**: Canvas 기반 실시간 드로잉 시스템
- 📈 **로그 모니터링**: ELK Stack 또는 Loki 기반 중앙화 로깅
- 🎯 **게임 로직 완성**: 점수 시스템, 턴 관리, 정답 처리

---

## 🏗️ **하이브리드 클라우드 아키텍처**

```mermaid
graph TB
    subgraph "🌍 Global Edge"
        Users[👥 Users Worldwide]
        CDN[☁️ Cloudflare CDN<br/>DDoS Protection<br/>Global Distribution]
    end
    
    subgraph "☁️ AWS Cloud (Seoul)"
        S3[📦 S3 Static Web<br/>React SPA]
        EC2[🖥️ EC2 Proxy<br/>Nginx Bridge]
        RDS[🗄️ RDS PostgreSQL<br/>Persistent Data<br/>Multi-AZ]
    end
    
    subgraph "🔗 Tailscale Mesh VPN"
        VPN[🔐 WireGuard Tunnel<br/>Zero-Trust Network<br/>Subnet Routing]
    end
    
    subgraph "🏠 Edge Infrastructure"
        subgraph "🥧 Raspberry Pi K8s Cluster"
            GameServer[🎮 Game Server<br/>Socket.IO + REST<br/>실시간 채팅 시스템]
            Redis[📦 Redis<br/>세션 & 캐시<br/>Pub/Sub]
            ArgoCD[🚀 ArgoCD<br/>GitOps Controller<br/>Self-Healing]
            Monitoring[📊 Prometheus<br/>Grafana Dashboard<br/>실시간 메트릭]
        end
    end
    
    Users -->|HTTPS| CDN
    CDN -->|Static| S3
    CDN -->|API| EC2
    EC2 -.->|VPN Tunnel| VPN
    VPN -.->|Encrypted| GameServer
    GameServer -->|Local Cache| Redis
    GameServer -.->|Persistent| RDS
    ArgoCD -->|Deploy| GameServer
```

### **🎯 하이브리드 설계 철학**

|**계층**|**배치 위치**|**선택 근거**|
|---|---|---|
|**정적 콘텐츠**|☁️ AWS S3 + Cloudflare|글로벌 CDN 활용|
|**실시간 통신**|🥧 라즈베리파이 Edge|WebSocket 지연시간 최소화|
|**영구 데이터**|☁️ AWS RDS|가용성 + 자동 백업|
|**네트워킹**|🔗 Tailscale VPN|Zero-Trust + NAT 트래버싱|

---

## 🚀 **핵심 기술 스택 & 차별화 요소**

### **🌊 하이브리드 클라우드 전문성** ⭐⭐⭐⭐⭐

```yaml
Physical Infrastructure:
  - Raspberry Pi 4 (ARM64) + USB SSD
  - Home Network Integration
  - Edge Computing Optimization

Cloud Infrastructure as Code:
  - Terraform: AWS VPC + EC2 + RDS + S3 프로비저닝
  - State Management: Terraform State 관리
  - Infrastructure Versioning: Git 기반 인프라 버전 관리

Hybrid Connectivity:
  - Tailscale Mesh VPN (WireGuard)
  - Subnet Route Advertisement  
  - Zero-Trust Architecture

CI/CD Integration:
  - GitHub Actions Self-hosted Runner
  - Private Registry Internal Access
  - Cross-Network Build Pipeline
```

### **⚙️ GitOps & DevOps 자동화**

```yaml
GitOps Implementation:
  - ArgoCD: Declarative Infrastructure
  - Self-Healing: Configuration Drift 자동 복구
  - Progressive Sync: 3분 간격 자동 동기화

CI/CD Pipeline:
  - GitHub Actions: Workflow 기반 자동화
  - Self-hosted Runner: 라즈베리파이에서 직접 실행
  - Private Registry Access: Internal Network 직접 연결
  - Multi-architecture Build: AMD64 + ARM64 동시 빌드

Infrastructure as Code:
  - Terraform: AWS 클라우드 인프라 프로비저닝 (VPC, EC2, RDS, S3)
  - Kubernetes Manifests: 컨테이너 워크로드 선언적 관리
  - Git Single Source of Truth: 모든 인프라 코드 버전 관리
  - Automated Rollback: 인프라 + 애플리케이션 통합 롤백
```

### **🏗️ Infrastructure as Code (IaC) 전문성**

```yaml
Terraform (AWS Cloud):
  - VPC: 서브넷, 라우팅 테이블, 인터넷 게이트웨이
  - EC2: Security Groups, Key Pairs, Instance 설정
  - RDS: PostgreSQL Multi-AZ, 서브넷 그룹, 파라미터 그룹
  - S3: Static Website Hosting, Bucket Policy
  - IAM: 최소 권한 역할 및 정책

Kubernetes Manifests (Edge):
  - Deployment: 컨테이너 워크로드 선언적 정의
  - Service: LoadBalancer, ClusterIP 네트워킹
  - ConfigMap/Secret: 설정 및 비밀 정보 관리
  - PersistentVolume: 스토리지 추상화

State Management:
  - Terraform State: 인프라 상태 중앙 관리
  - GitOps Sync: Kubernetes 리소스 실시간 동기화
  - Version Control: 모든 인프라 변경사항 Git 추적
```

### **🐳 컨테이너 & Kubernetes 최적화**

```yaml
Kubernetes Cluster:
  - Single-node Production Cluster
  - containerd + Docker 공존
  - MetalLB LoadBalancer (L2 Mode)

Resource Optimization:
  - 4GB RAM에서 7개 서비스 운영
  - Memory Limits & Requests 세밀 조정
  - ARM64 Native Performance

Container Strategy:
  - Multi-architecture Images
  - Private Registry (Harbor Alternative)
  - Self-signed TLS Certificate Management
```

### **📊 관찰성 & 모니터링**

```yaml
Monitoring Stack:
  - Prometheus: 시계열 메트릭 수집
  - Grafana: 통합 대시보드
  - Node Exporter: 시스템 메트릭
  - Custom Metrics: 게임 서버 지표

Observability:
  - Real-time Application Performance
  - Infrastructure Health Monitoring  
  - Alert Manager Integration
  - Cross-Cloud Metrics Correlation
```

---

## 📊 **DevOps 혁신: 수동 → 완전 IaC 자동화**

|**영역**|**Before (수동)**|**After (IaC + GitOps)**|**개선 효과**|
|---|---|---|---|
|**인프라 프로비저닝**|AWS 콘솔 클릭 (30분+)|Terraform Apply (5분)|**83% 시간 단축**|
|**애플리케이션 배포**|kubectl 수동 실행 (15분)|Git Push → ArgoCD (3분)|**80% 시간 단축**|
|**설정 일관성**|환경별 차이 발생|선언적 단일 진실 소스|**Configuration Drift 제거**|
|**롤백 시간**|수동 복구 (15분+)|Git Revert (30초)|**96% 시간 단축**|
|**장애 복구**|수동 감지 + 복구|Self-Healing 자동 복구|**MTTR 대폭 감소**|

### **🎯 현재 달성한 DevOps 성숙도**

```
Level 0: Manual Operations          ❌ (시작점)
Level 1: Infrastructure as Code     ✅ (Terraform)
Level 2: Basic GitOps              ✅ (ArgoCD)
Level 3: Automated GitOps          ✅ (Self-Healing)
Level 4: Self-Healing GitOps       ✅ (현재 위치)
Level 5: Intelligent Operations    🔄 (로그 모니터링 등 확장 계획)
```

---

## 🛠️ **시스템 접근 & 기술 검증**

### **🌐 공개 접근 가능한 엔드포인트**

```bash
# 웹사이트 접근
curl -I https://hwara-dev.kr
# → Cloudflare CDN + AWS S3 정적 호스팅 (Terraform 프로비저닝)

# API 헬스체크  
curl -s https://api.hwara-dev.kr/health | jq
# → AWS EC2 → Tailscale VPN → 라즈베리파이 K8s

# 시스템 상태 모니터링
curl -s https://api.hwara-dev.kr/api/status | jq
# → Prometheus 통합 메트릭 + 실시간 시스템 상태
```

### **🏗️ Infrastructure as Code 검증**

```bash
# Terraform 인프라 상태 확인
terraform plan   # 인프라 변경사항 미리보기
terraform show   # 현재 프로비저닝된 리소스 상태

# AWS 리소스 확인
aws ec2 describe-instances --region ap-northeast-2
aws rds describe-db-instances --region ap-northeast-2
aws s3 ls s3://hwara-dev.kr

# Kubernetes 리소스 확인  
kubectl get all -A  # 모든 네임스페이스 리소스
kubectl get nodes -o wide  # 클러스터 노드 상태
```

### **🔧 GitOps 워크플로 검증**

```bash
# 1. 코드 변경사항 Push
git clone https://github.com/Hwara/DrawGuess.git
# 게임 서버 코드 수정 후 Push

# 2. GitHub Actions 자동 빌드 확인
# Self-hosted Runner가 라즈베리파이에서 실행
# Private Registry (172.30.1.64:32000) 직접 접근
# Multi-arch Build: AMD64 + ARM64

# 3. ArgoCD 자동 동기화 확인
# GitOps Manifest 업데이트 → ArgoCD 감지 → 자동 배포
# 전체 과정: 약 3-5분

# 4. 배포 결과 확인
curl https://api.hwara-dev.kr/health
# 새 버전 자동 반영 확인
```

### **📊 모니터링 시스템 확인**

```bash
# ArgoCD GitOps 대시보드 (VPN 접근)
# http://172.30.1.105

# Grafana 통합 모니터링 (VPN 접근)  
# http://172.30.1.104
```

---

## 📚 **상세 기술 문서**

### **📋 완전한 프로젝트 문서**

- 📐 **[전체 아키텍처 다이어그램](https://github.com/Hwara/DrawGuess/blob/main/docs/architecture.md)** - 하이브리드 클라우드 전체 구조
- 🏗️ **[Terraform IaC 구성](https://github.com/Hwara/DrawGuess/blob/main/docs/terraform-infrastructure.md)** - AWS 인프라 코드 및 설계
- 🚀 **[GitOps 워크플로 가이드](https://github.com/Hwara/DrawGuess/blob/main/docs/gitops-workflow.md)** - 선언적 인프라 관리 패턴
- 🔧 **[CI/CD 파이프라인 구축](https://github.com/Hwara/DrawGuess/blob/main/docs/cicd-setup.md)** - Self-hosted Runner 기반 자동화
- 📊 **[운영 현황 리포트](https://github.com/Hwara/DrawGuess/blob/main/docs/operations-report.md)** - 실제 성과 및 학습 내용

### **🛠️ 구현 상세 가이드**

- 🚀 **[CI/CD 파이프라인 구축](https://github.com/Hwara/DrawGuess/blob/main/docs/cicd-setup.md)** - GitHub Actions + Self-hosted Runner 완전 가이드
- 🎮 **[게임 서버 API 명세](https://github.com/Hwara/DrawGuess/blob/main/docs/game-server-api.md)** - Socket.IO + REST API (현재: 채팅/방 관리, 계획: 그림 그리기)
- 📈 **[모니터링 API 명세](https://github.com/Hwara/DrawGuess/blob/main/docs/monitoring-api.md)** - Prometheus 통합 메트릭
- 🗄️ **[데이터베이스 스키마](https://github.com/Hwara/DrawGuess/blob/main/docs/database-schema.md)** - PostgreSQL + Redis 설계
- 🔒 **[보안 구성 가이드](https://github.com/Hwara/DrawGuess/blob/main/docs/security-setup.md)** - 다층 보안 아키텍처

### **📖 학습 자료**

- 🎯 **[프로젝트 회고](https://github.com/Hwara/DrawGuess/blob/main/docs/project-retrospective.md)** - 15주간의 개발 여정
- 🧠 **[기술적 의사결정](https://github.com/Hwara/DrawGuess/blob/main/docs/technical-decisions.md)** - Why 하이브리드 클라우드?
- 🔍 **[트러블슈팅 가이드](https://github.com/Hwara/DrawGuess/blob/main/docs/troubleshooting.md)** - 실제 마주친 문제들과 해결책

---

## 🎯 **포트폴리오 하이라이트**

### **💼 실무 적용 가능한 기술 스택**

- **대기업 하이브리드 전략**: 다수 기업이 추진하는 멀티 클라우드 패턴
- **스타트업 DevOps**: Terraform + GitOps 완전 자동화 인프라 구축 경험
- **엣지 컴퓨팅**: IoT, 5G, 실시간 서비스 확산 트렌드 부합
- **Infrastructure as Code**: 클라우드 + 컨테이너 통합 IaC 실무 역량

### **🏆 기술적 차별화**

```
🔥 희소성 높은 DevOps 경험:
├── 🏗️ Terraform + GitOps 통합 IaC (클라우드 + 컨테이너 완전 자동화)
├── 🥧 ARM64 Kubernetes 운영 최적화 (Apple Silicon, AWS Graviton 대비)
├── 🔗 하이브리드 네트워킹 설계 (Tailscale VPN + 서브넷 라우팅)  
├── 🚀 GitOps Self-Healing 구현 (Configuration Drift 자동 복구)
├── 🤖 Self-hosted Runner 운영 (Private Registry 네트워크 제약 해결)
├── 📊 크로스 클라우드 모니터링 (AWS + Edge 통합 관찰성)
└── ⚡ 실시간 통신 최적화 (WebSocket 기반 멀티플레이어)
```

### **📈 현재 달성한 기술적 성과**

- ✅ **안정적 인프라 운영**: 하이브리드 클라우드 24/7 가동
- ✅ **실시간 통신**: Socket.IO 기반 멀티플레이어 아키텍처
- ✅ **완전 자동화**: 수동 개입 0% DevOps 파이프라인
- ✅ **엔터프라이즈 보안**: DDoS 보호 + 다층 방어 + Zero-Trust

---

## 🚀 **향후 개발 계획**

### **Phase 1: 게임 기능 완성 (진행중)**

- 🎨 **Canvas 기반 그림 그리기**: 실시간 드로잉 동기화
- 🎯 **게임 로직**: 턴 관리, 점수 시스템, 정답 처리
- 🏆 **순위 시스템**: 개인/전체 통계 및 리더보드

### **Phase 2: 관찰성 강화 (계획)**

- 📊 **중앙화 로깅**: ELK Stack 또는 Grafana Loki
- 🔍 **분산 추적**: Jaeger 또는 Zipkin 도입
- 🚨 **지능형 알림**: Slack/Discord 통합 + 임계값 모니터링

### **Phase 3: 확장성 고도화 (장기)**

- 🌐 **멀티 클러스터**: 지역별 엣지 노드 확장
- 🔒 **고급 보안**: Sealed Secrets, OPA Gatekeeper
- 🤖 **AI/ML Ops**: Kubeflow 기반 ML 파이프라인

---

## 🤖 **프로젝트 개발 방법론**

### **DevOps/인프라 전문성 집중 개발**

```yaml
직접 구현 (핵심 역량):
  - 하이브리드 클라우드 아키텍처: 물리적 + 클라우드 설계
  - Terraform IaC: AWS 전체 인프라 프로비저닝
  - Kubernetes 운영: 라즈베리파이 클러스터 구축 및 최적화
  - GitOps 구현: ArgoCD + Self-Healing 자동화
  - CI/CD 파이프라인: GitHub Actions + Self-hosted Runner
  - 모니터링 시스템: Prometheus + Grafana 통합

AI 구현 (연습용 워크로드):
  - Frontend: React SPA (인프라 테스트용 정적 사이트)
  - Backend: Node.js 게임 서버 (실시간 통신 워크로드)
  - 목적: DevOps 기술 스택 연습을 위한 실제 애플리케이션 워크로드
```

> 🎯 **프로젝트 포커스**: DevOps/인프라 엔지니어링 전문성 개발이 핵심, 애플리케이션은 기술 스택 검증용

---

## 🤝 **Contact & Links**

- **Live Demo**: [https://hwara-dev.kr](https://hwara-dev.kr/)
- **GitHub**: [https://github.com/Hwara/DrawGuess](https://github.com/Hwara/DrawGuess)
- **Portfolio**: [Your Portfolio URL]
- **LinkedIn**: [Your LinkedIn Profile]

---

**💡 이 프로젝트는 하이브리드 클라우드 인프라와 GitOps 자동화의 실무 구현 사례를 보여주며, 실시간 멀티플레이어 시스템 개발을 통해 지속적으로 발전하고 있습니다.**