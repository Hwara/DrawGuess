# ========================================
# DrawGuess 프로젝트 출력값
# ========================================

# 웹사이트 정보
output "website_url" {
  description = "웹사이트 URL"
  value       = "https://${var.domain_name}"
}

output "cloudfront_domain" {
  description = "CloudFront 배포 도메인"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront 배포 ID (캐시 무효화에 필요)"
  value       = aws_cloudfront_distribution.website.id
  sensitive   = false
}

# S3 정보
output "s3_bucket_name" {
  description = "웹사이트 S3 버킷 이름"
  value       = aws_s3_bucket.website.bucket
}

output "s3_bucket_arn" {
  description = "웹사이트 S3 버킷 ARN"
  value       = aws_s3_bucket.website.arn
}

output "s3_website_endpoint" {
  description = "S3 웹사이트 엔드포인트"
  value       = aws_s3_bucket_website_configuration.website.website_endpoint
}

# DNS 정보
output "route53_zone_id" {
  description = "Route 53 호스팅 영역 ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "route53_name_servers" {
  description = "Route 53 네임서버 (도메인 설정용)"
  value       = data.aws_route53_zone.main.name_servers
}

# SSL 인증서
output "ssl_certificate_arn" {
  description = "SSL 인증서 ARN"
  value       = aws_acm_certificate_validation.website.certificate_arn
  sensitive   = false
}

output "ssl_certificate_status" {
  description = "SSL 인증서 상태"
  value       = aws_acm_certificate.website.status
}

# 모니터링
output "cloudwatch_dashboard_url" {
  description = "CloudWatch 대시보드 URL"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.website.dashboard_name}"
}

output "budget_name" {
  description = "예산 알림 이름"
  value       = aws_budgets_budget.website.name
}

# 배포 정보 (GitHub Actions에서 사용)
output "deployment_info" {
  description = "배포에 필요한 정보"
  value = {
    s3_bucket                  = aws_s3_bucket.website.bucket
    cloudfront_distribution_id = aws_cloudfront_distribution.website.id
    website_url               = "https://${var.domain_name}"
    aws_region                = var.aws_region
  }
  sensitive = false
}

# 비용 최적화 정보
output "cost_optimization_info" {
  description = "비용 최적화 정보"
  value = {
    cloudfront_price_class = var.cloudfront_price_class
    s3_storage_class      = "STANDARD"
    monthly_budget_limit  = var.monthly_budget_limit
    estimated_monthly_cost = "$2-5 USD"
  }
}

# 보안 정보
output "security_info" {
  description = "보안 설정 정보"
  value = {
    ssl_enabled               = true
    s3_public_access_blocked = true
    cloudfront_only_access   = true
    https_redirect           = true
  }
}

# 다음 단계 정보
output "next_steps" {
  description = "다음 단계 안내"
  value = {
    "1_upload_website" = "웹사이트 파일을 S3 버킷에 업로드하세요: aws s3 sync ./frontend/build s3://${aws_s3_bucket.website.bucket}"
    "2_invalidate_cache" = "CloudFront 캐시를 무효화하세요: aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.website.id} --paths '/*'"
    "3_check_website" = "웹사이트를 확인하세요: https://${var.domain_name}"
    "4_monitor" = "CloudWatch에서 모니터링하세요: ${aws_cloudwatch_dashboard.website.dashboard_name}"
  }
}

# 보안 강화된 출력값들

# RDS 기본 정보 (안전함)
output "rds_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "RDS PostgreSQL endpoint"
}

output "rds_port" {
  value       = aws_db_instance.postgres.port
  description = "RDS PostgreSQL port"
}

output "rds_database_name" {
  value       = aws_db_instance.postgres.db_name
  description = "RDS database name"
}

output "rds_username" {
  value       = aws_db_instance.postgres.username
  description = "RDS username"
  sensitive   = true  # 사용자명도 민감한 정보로 처리
}

# Secrets Manager ARN (안전함 - ARN은 공개되어도 접근 권한이 있어야 사용 가능)
output "secrets_manager_secret_arn" {
  value       = aws_secretsmanager_secret.db_credentials.arn
  description = "Secrets Manager ARN for database credentials"
}

# Tailscale 정보 (안전함)
output "tailscale_instance_ip" {
  value       = aws_instance.tailscale.public_ip
  description = "Tailscale EC2 instance public IP"
}

output "tailscale_instance_id" {
  value       = aws_instance.tailscale.id
  description = "Tailscale EC2 instance ID"
}

# VPC 정보 (안전함)
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "VPC ID"
}

output "private_subnet_ids" {
  value       = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  description = "Private subnet IDs for RDS"
}