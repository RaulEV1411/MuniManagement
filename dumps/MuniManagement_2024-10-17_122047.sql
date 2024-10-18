-- MySQL dump 10.13  Distrib 8.0.39, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: MuniManagement
-- ------------------------------------------------------
-- Server version	9.0.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Departments_departamentos`
--

DROP TABLE IF EXISTS `Departments_departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Departments_departamentos` (
  `departamentos_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  `direccion_id` char(32) NOT NULL,
  PRIMARY KEY (`departamentos_ID`),
  UNIQUE KEY `name` (`name`),
  KEY `Departments_departam_direccion_id_3a4557c4_fk_Departmen` (`direccion_id`),
  CONSTRAINT `Departments_departam_direccion_id_3a4557c4_fk_Departmen` FOREIGN KEY (`direccion_id`) REFERENCES `Departments_direccion` (`direccion_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Departments_departamentos`
--

/*!40000 ALTER TABLE `Departments_departamentos` DISABLE KEYS */;
INSERT INTO `Departments_departamentos` VALUES ('4ed25e4a199a4112b61b18202d98b028','Alcaldia','cd8ad3819d9049af87f7bf18d96dec5e');
/*!40000 ALTER TABLE `Departments_departamentos` ENABLE KEYS */;

--
-- Table structure for table `Departments_direccion`
--

DROP TABLE IF EXISTS `Departments_direccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Departments_direccion` (
  `direccion_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`direccion_ID`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Departments_direccion`
--

/*!40000 ALTER TABLE `Departments_direccion` DISABLE KEYS */;
INSERT INTO `Departments_direccion` VALUES ('da40228619024ef68d1f55e2033e93b7','Administrativa'),('cd8ad3819d9049af87f7bf18d96dec5e','Alcaldia');
/*!40000 ALTER TABLE `Departments_direccion` ENABLE KEYS */;

--
-- Table structure for table `Feedback_feedback`
--

DROP TABLE IF EXISTS `Feedback_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Feedback_feedback` (
  `feed_ID` char(32) NOT NULL,
  `info` varchar(255) NOT NULL,
  `proyecto_ID_id` char(32) NOT NULL,
  PRIMARY KEY (`feed_ID`),
  UNIQUE KEY `info` (`info`),
  KEY `Feedback_feedback_proyecto_ID_id_ba8bc005_fk_Projects_` (`proyecto_ID_id`),
  CONSTRAINT `Feedback_feedback_proyecto_ID_id_ba8bc005_fk_Projects_` FOREIGN KEY (`proyecto_ID_id`) REFERENCES `Projects_proyectos` (`proyect_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Feedback_feedback`
--

/*!40000 ALTER TABLE `Feedback_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `Feedback_feedback` ENABLE KEYS */;

--
-- Table structure for table `Projects_estado`
--

DROP TABLE IF EXISTS `Projects_estado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Projects_estado` (
  `estado_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`estado_ID`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Projects_estado`
--

/*!40000 ALTER TABLE `Projects_estado` DISABLE KEYS */;
INSERT INTO `Projects_estado` VALUES ('0032992780a34d0f8c558e0e7bca8e02','Pendiente');
/*!40000 ALTER TABLE `Projects_estado` ENABLE KEYS */;

--
-- Table structure for table `Projects_prioridad`
--

DROP TABLE IF EXISTS `Projects_prioridad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Projects_prioridad` (
  `prioridad_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`prioridad_ID`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Projects_prioridad`
--

/*!40000 ALTER TABLE `Projects_prioridad` DISABLE KEYS */;
INSERT INTO `Projects_prioridad` VALUES ('4e2fd2628fe940dca8f8393b89af9bb4','Alta'),('90698466c5ca4a1db81a839bb03faf35','Baja');
/*!40000 ALTER TABLE `Projects_prioridad` ENABLE KEYS */;

--
-- Table structure for table `Projects_proyectos_tipos`
--

DROP TABLE IF EXISTS `Projects_proyectos_tipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Projects_proyectos_tipos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `proyecto_id` char(32) NOT NULL,
  `tipo_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Projects_proyectos_t_proyecto_id_d3d7e022_fk_Projects_` (`proyecto_id`),
  KEY `Projects_proyectos_t_tipo_id_7c76449d_fk_Projects_` (`tipo_id`),
  CONSTRAINT `Projects_proyectos_t_proyecto_id_d3d7e022_fk_Projects_` FOREIGN KEY (`proyecto_id`) REFERENCES `Projects_proyectos` (`proyect_id`),
  CONSTRAINT `Projects_proyectos_t_tipo_id_7c76449d_fk_Projects_` FOREIGN KEY (`tipo_id`) REFERENCES `Projects_tipos` (`tipos_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Projects_proyectos_tipos`
--

/*!40000 ALTER TABLE `Projects_proyectos_tipos` DISABLE KEYS */;
/*!40000 ALTER TABLE `Projects_proyectos_tipos` ENABLE KEYS */;

--
-- Table structure for table `Projects_tipos`
--

DROP TABLE IF EXISTS `Projects_tipos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Projects_tipos` (
  `tipos_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`tipos_ID`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Projects_tipos`
--

/*!40000 ALTER TABLE `Projects_tipos` DISABLE KEYS */;
/*!40000 ALTER TABLE `Projects_tipos` ENABLE KEYS */;

--
-- Table structure for table `Task_tareas`
--

DROP TABLE IF EXISTS `Task_tareas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Task_tareas` (
  `tareas_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_entrega` date NOT NULL,
  `estado_ID_id` char(32) NOT NULL,
  `prioridad_ID_id` char(32) NOT NULL,
  `proyecto_ID_id` char(32) NOT NULL,
  PRIMARY KEY (`tareas_ID`),
  UNIQUE KEY `descripcion` (`descripcion`),
  KEY `Task_tareas_estado_ID_id_8061624f_fk_Projects_estado_estado_ID` (`estado_ID_id`),
  KEY `Task_tareas_prioridad_ID_id_bfffece7_fk_Projects_` (`prioridad_ID_id`),
  KEY `Task_tareas_proyecto_ID_id_a770e3c7_fk_Projects_` (`proyecto_ID_id`),
  CONSTRAINT `Task_tareas_estado_ID_id_8061624f_fk_Projects_estado_estado_ID` FOREIGN KEY (`estado_ID_id`) REFERENCES `Projects_estado` (`estado_ID`),
  CONSTRAINT `Task_tareas_prioridad_ID_id_bfffece7_fk_Projects_` FOREIGN KEY (`prioridad_ID_id`) REFERENCES `Projects_prioridad` (`prioridad_ID`),
  CONSTRAINT `Task_tareas_proyecto_ID_id_a770e3c7_fk_Projects_` FOREIGN KEY (`proyecto_ID_id`) REFERENCES `Projects_proyectos` (`proyect_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Task_tareas`
--

/*!40000 ALTER TABLE `Task_tareas` DISABLE KEYS */;
/*!40000 ALTER TABLE `Task_tareas` ENABLE KEYS */;

--
-- Table structure for table `Users_roles`
--

DROP TABLE IF EXISTS `Users_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users_roles` (
  `role_ID` char(32) NOT NULL,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`role_ID`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users_roles`
--

/*!40000 ALTER TABLE `Users_roles` DISABLE KEYS */;
INSERT INTO `Users_roles` VALUES ('c840a22e56d343e6bc1759f461a529af','Alcalde');
/*!40000 ALTER TABLE `Users_roles` ENABLE KEYS */;

--
-- Table structure for table `Users_users`
--

DROP TABLE IF EXISTS `Users_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users_users` (
  `user_ID` char(32) NOT NULL,
  `first_name` varchar(25) NOT NULL,
  `last_name` varchar(25) NOT NULL,
  `cedula` int NOT NULL,
  `phone_number` int NOT NULL,
  `email` varchar(254) NOT NULL,
  `password` varchar(255) NOT NULL,
  `birthday` date NOT NULL,
  `puesto` varchar(25) NOT NULL,
  `departamento_ID_id` char(32) NOT NULL,
  `role_id` char(32) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`user_ID`),
  UNIQUE KEY `cedula` (`cedula`),
  UNIQUE KEY `email` (`email`),
  KEY `Users_users_departamento_ID_id_9b871d34_fk_Departmen` (`departamento_ID_id`),
  KEY `Users_users_role_id_8972ef0a_fk_Users_roles_role_ID` (`role_id`),
  CONSTRAINT `Users_users_departamento_ID_id_9b871d34_fk_Departmen` FOREIGN KEY (`departamento_ID_id`) REFERENCES `Departments_departamentos` (`departamentos_ID`),
  CONSTRAINT `Users_users_role_id_8972ef0a_fk_Users_roles_role_ID` FOREIGN KEY (`role_id`) REFERENCES `Users_roles` (`role_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Users_users`
--

/*!40000 ALTER TABLE `Users_users` DISABLE KEYS */;
INSERT INTO `Users_users` VALUES ('d0f88d9b37a64c6b835bef3e458d2590','Raul','Espinoza',60476588,62496933,'alessandro14112003@gmail.com','pbkdf2_sha256$870000$lvGM22ZY43oTXfxlTR1NGV$shCvNLyZthUdG+8BvmTkW6wXB/vXwV0ZBwjY7AYkXCA=','2003-11-14','Programador','4ed25e4a199a4112b61b18202d98b028','c840a22e56d343e6bc1759f461a529af',NULL);
/*!40000 ALTER TABLE `Users_users` ENABLE KEYS */;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',2,'add_permission'),(6,'Can change permission',2,'change_permission'),(7,'Can delete permission',2,'delete_permission'),(8,'Can view permission',2,'view_permission'),(9,'Can add group',3,'add_group'),(10,'Can change group',3,'change_group'),(11,'Can delete group',3,'delete_group'),(12,'Can view group',3,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add direccion',6,'add_direccion'),(22,'Can change direccion',6,'change_direccion'),(23,'Can delete direccion',6,'delete_direccion'),(24,'Can view direccion',6,'view_direccion'),(25,'Can add departamentos',7,'add_departamentos'),(26,'Can change departamentos',7,'change_departamentos'),(27,'Can delete departamentos',7,'delete_departamentos'),(28,'Can view departamentos',7,'view_departamentos'),(29,'Can add roles',8,'add_roles'),(30,'Can change roles',8,'change_roles'),(31,'Can delete roles',8,'delete_roles'),(32,'Can view roles',8,'view_roles'),(33,'Can add users',9,'add_users'),(34,'Can change users',9,'change_users'),(35,'Can delete users',9,'delete_users'),(36,'Can view users',9,'view_users'),(37,'Can add estado',10,'add_estado'),(38,'Can change estado',10,'change_estado'),(39,'Can delete estado',10,'delete_estado'),(40,'Can view estado',10,'view_estado'),(41,'Can add prioridad',11,'add_prioridad'),(42,'Can change prioridad',11,'change_prioridad'),(43,'Can delete prioridad',11,'delete_prioridad'),(44,'Can view prioridad',11,'view_prioridad'),(45,'Can add tipos',12,'add_tipos'),(46,'Can change tipos',12,'change_tipos'),(47,'Can delete tipos',12,'delete_tipos'),(48,'Can view tipos',12,'view_tipos'),(49,'Can add proyectos',13,'add_proyectos'),(50,'Can change proyectos',13,'change_proyectos'),(51,'Can delete proyectos',13,'delete_proyectos'),(52,'Can view proyectos',13,'view_proyectos'),(53,'Can add proyectos_tipos',14,'add_proyectos_tipos'),(54,'Can change proyectos_tipos',14,'change_proyectos_tipos'),(55,'Can delete proyectos_tipos',14,'delete_proyectos_tipos'),(56,'Can view proyectos_tipos',14,'view_proyectos_tipos'),(57,'Can add tareas',15,'add_tareas'),(58,'Can change tareas',15,'change_tareas'),(59,'Can delete tareas',15,'delete_tareas'),(60,'Can view tareas',15,'view_tareas'),(61,'Can add feedback',16,'add_feedback'),(62,'Can change feedback',16,'change_feedback'),(63,'Can delete feedback',16,'delete_feedback'),(64,'Can view feedback',16,'view_feedback'),(65,'Can add Token',17,'add_token'),(66,'Can change Token',17,'change_token'),(67,'Can delete Token',17,'delete_token'),(68,'Can view Token',17,'view_token'),(69,'Can add Token',18,'add_tokenproxy'),(70,'Can change Token',18,'change_tokenproxy'),(71,'Can delete Token',18,'delete_tokenproxy'),(72,'Can view Token',18,'view_tokenproxy');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;

--
-- Table structure for table `authtoken_token`
--

DROP TABLE IF EXISTS `authtoken_token`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authtoken_token` (
  `key` varchar(40) NOT NULL,
  `created` datetime(6) NOT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`key`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `authtoken_token_user_id_35299eff_fk_Users_users_user_ID` FOREIGN KEY (`user_id`) REFERENCES `Users_users` (`user_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authtoken_token`
--

/*!40000 ALTER TABLE `authtoken_token` DISABLE KEYS */;
/*!40000 ALTER TABLE `authtoken_token` ENABLE KEYS */;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` char(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_Users_users_user_ID` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_Users_users_user_ID` FOREIGN KEY (`user_id`) REFERENCES `Users_users` (`user_ID`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (1,'admin','logentry'),(3,'auth','group'),(2,'auth','permission'),(17,'authtoken','token'),(18,'authtoken','tokenproxy'),(4,'contenttypes','contenttype'),(7,'Departments','departamentos'),(6,'Departments','direccion'),(16,'Feedback','feedback'),(10,'Projects','estado'),(11,'Projects','prioridad'),(13,'Projects','proyectos'),(14,'Projects','proyectos_tipos'),(12,'Projects','tipos'),(5,'sessions','session'),(15,'Task','tareas'),(8,'Users','roles'),(9,'Users','users');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'Departments','0001_initial','2024-10-17 18:02:21.260812'),(2,'Departments','0002_departamentos','2024-10-17 18:02:21.721015'),(3,'Users','0001_initial','2024-10-17 18:02:21.855194'),(4,'Users','0002_users','2024-10-17 18:02:22.795028'),(5,'Projects','0001_initial','2024-10-17 18:02:22.919447'),(6,'Projects','0002_prioridad','2024-10-17 18:02:23.047847'),(7,'Projects','0003_tipos','2024-10-17 18:02:23.163605'),(8,'Projects','0004_proyectos','2024-10-17 18:02:24.625545'),(9,'Projects','0005_proyectos_tipos','2024-10-17 18:02:25.276922'),(10,'Projects','0006_alter_proyectos_descripcion','2024-10-17 18:02:25.684762'),(11,'Projects','0007_rename_departamento_proyectos_departamento_id_and_more','2024-10-17 18:02:27.723537'),(12,'Feedback','0001_initial','2024-10-17 18:02:28.088159'),(13,'Projects','0008_rename_departamento_id_proyectos_departamento_and_more','2024-10-17 18:02:30.084701'),(14,'Task','0001_initial','2024-10-17 18:02:30.979000'),(15,'Task','0002_alter_tareas_descripcion','2024-10-17 18:02:31.301754'),(16,'contenttypes','0001_initial','2024-10-17 18:02:31.503030'),(17,'contenttypes','0002_remove_content_type_name','2024-10-17 18:02:31.759228'),(18,'auth','0001_initial','2024-10-17 18:02:32.979053'),(19,'auth','0002_alter_permission_name_max_length','2024-10-17 18:02:33.200980'),(20,'auth','0003_alter_user_email_max_length','2024-10-17 18:02:33.221695'),(21,'auth','0004_alter_user_username_opts','2024-10-17 18:02:33.239976'),(22,'auth','0005_alter_user_last_login_null','2024-10-17 18:02:33.259225'),(23,'auth','0006_require_contenttypes_0002','2024-10-17 18:02:33.276502'),(24,'auth','0007_alter_validators_add_error_messages','2024-10-17 18:02:33.295943'),(25,'auth','0008_alter_user_username_max_length','2024-10-17 18:02:33.315673'),(26,'auth','0009_alter_user_last_name_max_length','2024-10-17 18:02:33.349902'),(27,'auth','0010_alter_group_name_max_length','2024-10-17 18:02:33.393788'),(28,'auth','0011_update_proxy_permissions','2024-10-17 18:02:33.432282'),(29,'auth','0012_alter_user_first_name_max_length','2024-10-17 18:02:33.449444'),(30,'Users','0003_users_groups_users_is_superuser_users_last_login_and_more','2024-10-17 18:02:34.752764'),(31,'Users','0004_remove_users_groups_remove_users_is_superuser_and_more','2024-10-17 18:02:35.214883'),(32,'Users','0005_users_groups_users_is_superuser_and_more','2024-10-17 18:02:36.649306'),(33,'Users','0006_alter_users_managers_remove_users_groups_and_more','2024-10-17 18:02:37.153604'),(34,'Users','0007_remove_users_is_active_remove_users_is_anonymous_and_more','2024-10-17 18:02:37.527653'),(35,'admin','0001_initial','2024-10-17 18:02:38.133637'),(36,'admin','0002_logentry_remove_auto_add','2024-10-17 18:02:38.154494'),(37,'admin','0003_logentry_add_action_flag_choices','2024-10-17 18:02:38.175122'),(38,'authtoken','0001_initial','2024-10-17 18:02:38.553072'),(39,'authtoken','0002_auto_20160226_1747','2024-10-17 18:02:38.624687'),(40,'authtoken','0003_tokenproxy','2024-10-17 18:02:38.641414'),(41,'authtoken','0004_alter_tokenproxy_options','2024-10-17 18:02:38.659644'),(42,'sessions','0001_initial','2024-10-17 18:02:38.826904'),(43,'Projects','0009_rename_proyect_proyectos_proyect_id','2024-10-17 18:19:12.887718');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;

--
-- Dumping routines for database 'MuniManagement'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-10-17 12:21:23
