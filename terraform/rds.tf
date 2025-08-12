# ========================================
# RDS PostgreSQL - DrawGuess 데이터베이스
# ========================================

# DB 서브넷 그룹
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# DB 파라미터 그룹 (PostgreSQL 최적화 - 개발환경용 단순화)
resource "aws_db_parameter_group" "postgres" {
  family = "postgres17"
  name   = "${local.name_prefix}-postgres-params"

  # 개발 환경용 동적 파라미터만 설정 (재시작 불필요)
  parameter {
    name  = "log_statement"
    value = "mod"  # DDL, DML만 로깅 (all에서 변경)
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # 1초 이상 걸리는 쿼리 로깅
  }

  parameter {
    name  = "log_connections"
    value = "1"  # 연결 로깅 활성화
  }

  parameter {
    name  = "log_disconnections"
    value = "1"  # 연결 해제 로깅 활성화
  }

  tags = local.common_tags
}

# DB 옵션 그룹
resource "aws_db_option_group" "postgres" {
  name                 = "${local.name_prefix}-postgres-options"
  option_group_description = "DrawGuess PostgreSQL options"
  engine_name          = "postgres"
  major_engine_version = "17"

  tags = local.common_tags
}

# RDS 인스턴스
resource "aws_db_instance" "postgres" {
  # 기본 설정
  identifier = "${local.name_prefix}-postgres"
  engine     = "postgres"
  engine_version = "17.5"

  # 인스턴스 설정
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp2"
  storage_encrypted = true

  # 데이터베이스 설정
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  # 네트워크 설정
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false  # 보안을 위해 프라이빗

  # 고가용성 설정 (개발 환경에서는 비활성화)
  multi_az = false

  # 백업 설정
  backup_retention_period = 7      # 7일 백업 보관
  backup_window          = "03:00-04:00"  # UTC 기준
  maintenance_window     = "sun:04:00-sun:05:00"

  # 모니터링 설정
  monitoring_interval = var.enable_enhanced_monitoring ? 60 : 0
  
  # 성능 개선 설정
  performance_insights_enabled = false  # 프리티어에서는 비활성화
  
  # 파라미터 그룹 연결
  parameter_group_name = aws_db_parameter_group.postgres.name
  option_group_name    = aws_db_option_group.postgres.name

  # 삭제 보호
  deletion_protection = var.enable_rds_deletion_protection
  skip_final_snapshot = !var.enable_rds_deletion_protection

  # 자동 마이너 버전 업그레이드
  auto_minor_version_upgrade = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-postgres"
  })

  # 보안 및 네트워크 설정이 완료된 후 생성
  depends_on = [
    aws_security_group.rds,
    aws_db_subnet_group.main
  ]
}

# CloudWatch 로그 그룹 (PostgreSQL 로그용)
resource "aws_cloudwatch_log_group" "postgres" {
  name              = "/aws/rds/instance/${aws_db_instance.postgres.id}/postgresql"
  retention_in_days = 7  # 개발 환경에서는 7일만 보관

  tags = local.common_tags
}

# Secrets Manager에 DB 접속 정보 저장
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}-db-credentials"
  description = "DrawGuess PostgreSQL database credentials"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = aws_db_instance.postgres.endpoint
    port     = aws_db_instance.postgres.port
    dbname   = var.db_name
    connection_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}:${aws_db_instance.postgres.port}/${var.db_name}"
  })
}

# 출력값
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
  sensitive   = true
}

output "secrets_manager_secret_arn" {
  value       = aws_secretsmanager_secret.db_credentials.arn
  description = "Secrets Manager ARN for database credentials"
}