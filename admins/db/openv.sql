-- MySQL dump 10.13  Distrib 5.7.17-ndb-7.5.5, for linux-glibc2.5 (x86_64)
--
-- Host: localhost    Database: openv
-- ------------------------------------------------------
-- Server version	5.7.17-ndb-7.5.5-cluster-gpl

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_faqs`
--

DROP TABLE IF EXISTS `_faqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_faqs` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Q` varchar(255) DEFAULT '',
  `A` mediumtext,
  `Capability` varchar(255) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_faqs`
--

LOCK TABLES `_faqs` WRITE;
/*!40000 ALTER TABLE `_faqs` DISABLE KEYS */;
INSERT INTO `_faqs` VALUES (3,'What is the customer trying to do??','','X'),(4,'What is our approach?','','X'),(10,'What is are customer trying to do??',NULL,'X'),(11,'What will it cost?','this is a test?','X');
/*!40000 ALTER TABLE `_faqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `apps`
--

DROP TABLE IF EXISTS `apps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apps` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Ver` varchar(32) DEFAULT NULL,
  `Released` date DEFAULT NULL,
  `Title` varchar(255) DEFAULT NULL,
  `Cores` int(11) DEFAULT '0',
  `Sockets` int(11) DEFAULT '0',
  `Host` varchar(128) DEFAULT '',
  `Port` int(11) DEFAULT '3000',
  `PKI` int(11) DEFAULT '0',
  `DB` varchar(64) DEFAULT '',
  `Name` varchar(32) DEFAULT '',
  `Nick` varchar(32) DEFAULT '',
  `Byline` varchar(128) DEFAULT '',
  `Moderators` varchar(255) DEFAULT '',
  `POC` varchar(128) DEFAULT '',
  `Challenge` mediumtext,
  `classif` json DEFAULT NULL,
  `Allocated` int(11) DEFAULT '0',
  `Started` datetime DEFAULT NULL,
  `Booted` datetime DEFAULT NULL,
  `Enabled` int(11) DEFAULT '0',
  `Spawn` int(11) DEFAULT '0',
  `App` varchar(32) DEFAULT '',
  `Peers` int(11) DEFAULT '0',
  `Sessions` int(11) DEFAULT '100',
  `Protect` int(11) DEFAULT '0',
  `Credits` varchar(64) DEFAULT NULL,
  `Hawks` mediumtext,
  `EmailHost` varchar(128) DEFAULT NULL,
  `EmailUser` varchar(128) DEFAULT NULL,
  `Ping` int(11) DEFAULT NULL,
  `asp` json DEFAULT NULL,
  `isp` json DEFAULT NULL,
  `Proxy` int(11) DEFAULT NULL,
  `Cost` float DEFAULT '5000',
  `Parms` mediumtext,
  `PM` mediumtext,
  `ISSO` mediumtext,
  `ATP` mediumtext,
  `IATT` mediumtext,
  `DAO` mediumtext,
  `DTO` mediumtext,
  `SORN` varchar(64) DEFAULT 'TBD',
  `SPID` varchar(64) DEFAULT 'TBD',
  `Info` json DEFAULT NULL,
  `Encrypt` varchar(64) DEFAULT '',
  `Riddles` int(11) DEFAULT '0',
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `apps`
--

LOCK TABLES `apps` WRITE;
/*!40000 ALTER TABLE `apps` DISABLE KEYS */;
INSERT INTO `apps` VALUES (5,'0.33','2014-05-11','Totem',0,0,'localhost',8080,0,'app1','app1','Totem','','','brian.d.james@comcast.net',NULL,'{\"level\": \"U\", \"purpose\": \"nada\"}',0,NULL,NULL,1,0,'app1',0,100,0,'NGA/IIG','brian.d.james@comcast.net','smtp.comcast.net:587','brian.d.james:COMCASTsnivel1',1800000,'{\"org\": \"BOOZ\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"Ctr\"}','{\"org\": \"NGA-T\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"spend your money\"}',0,5000,'','{\"name\":\"TBD\",\"title\":\"Program Mgr\",\"addr\":\"nowheres\"}',NULL,NULL,NULL,NULL,NULL,'TBD','TBD','{\"a\": [{\"ID\": 0, \"SORN\": \"TBD\", \"SPID\": \"TBD\"}], \"b\": [{\"ID\": 1, \"NISTid\": \"TBD\", \"NISTtype\": \"a1\"}, {\"ID\": 2, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}, {\"ID\": 3, \"NISTtype\": \"a2\"}]}','',0),(7,'0.33','2014-05-11','Totem',2,0,'localhost',8080,1,'app1','node0','','','','brian.d.james@comcast.net',NULL,'{\"level\": \"U\", \"purpose\": \"nada\"}',0,NULL,NULL,1,0,'app1',1,100,0,'NGA/IIG','brian.d.james@comcast.net','smtp.comcast.net:587','brian.d.james:COMCASTsnivel1',1800000,'{\"org\": \"BOOZ\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"Ctr\"}','{\"org\": \"NGA-T\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"spend your money\"}',0,5000,'','{\"name\":\"TBD\",\"title\":\"Program Mgr\",\"addr\":\"nowheres\"}',NULL,NULL,NULL,NULL,NULL,'TBD','TBD','{\"a\": [{\"ID\": 0, \"SORN\": \"TBD\", \"SPID\": \"TBD\"}], \"b\": [{\"ID\": 1, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}, {\"ID\": 2, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}]}','',0),(8,'0.33','2014-05-11','Totem',2,0,'localhost',8080,0,'app1','node3','','','','brian.d.james@comcast.net',NULL,'{\"level\": \"U\", \"purpose\": \"nada\"}',0,NULL,NULL,1,0,'app1',1,100,0,'NGA/IIG','brian.d.james@comcast.net','smtp.comcast.net:587','brian.d.james:COMCASTsnivel1',1800000,'{\"org\": \"BOOZ\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"Ctr\"}','{\"org\": \"NGA-T\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"spend your money\"}',0,5000,'','{\"name\":\"TBD\",\"title\":\"Program Mgr\",\"addr\":\"nowheres\"}',NULL,NULL,NULL,NULL,NULL,'TBD','TBD','{\"a\": [{\"ID\": 0, \"SORN\": \"TBD\", \"SPID\": \"TBD\"}], \"b\": [{\"ID\": 1, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}, {\"ID\": 2, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}]}','',0),(9,'0.33','2014-05-11','Totem',2,0,'localhost',8080,0,'app1','node2','','','','brian.d.james@comcast.net',NULL,'{\"level\": \"U\", \"purpose\": \"nada\"}',0,NULL,NULL,1,0,'app1',1,100,0,'NGA/IIG','brian.d.james@comcast.net','smtp.comcast.net:587','brian.d.james:COMCASTsnivel1',1800000,'{\"org\": \"BOOZ\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"Ctr\"}','{\"org\": \"NGA-T\", \"addr\": \"nowhere\", \"name\": \"TBD\", \"title\": \"spend your money\"}',0,5000,'','{\"name\":\"TBD\",\"title\":\"Program Mgr\",\"addr\":\"nowheres\"}',NULL,NULL,NULL,NULL,NULL,'TBD','TBD','{\"a\": [{\"ID\": 0, \"SORN\": \"TBD\", \"SPID\": \"TBD\"}], \"b\": [{\"ID\": 1, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}, {\"ID\": 2, \"NISTid\": \"TBD\", \"NISTtype\": \"TBD\"}]}','',0);
/*!40000 ALTER TABLE `apps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aspreqts`
--

DROP TABLE IF EXISTS `aspreqts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `aspreqts` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Num` varchar(32) DEFAULT NULL,
  `Reqt` mediumtext CHARACTER SET utf8,
  `Score` int(11) DEFAULT NULL,
  `ByTest` int(11) DEFAULT NULL,
  `ByDemo` int(11) DEFAULT NULL,
  `ByAnalysis` int(11) DEFAULT NULL,
  `ByInspect` int(11) DEFAULT NULL,
  `Special` mediumtext,
  `Security` int(11) DEFAULT NULL,
  `Cost` int(11) DEFAULT NULL,
  `Maint` int(11) DEFAULT NULL,
  `FaultTol` int(11) DEFAULT NULL,
  `ContentMgt` int(11) DEFAULT NULL,
  `AdvVis` int(11) DEFAULT NULL,
  `CloudCompute` int(11) DEFAULT NULL,
  `SOM` int(11) DEFAULT NULL,
  `ABI` int(11) DEFAULT NULL,
  `ITEM1` int(11) DEFAULT NULL,
  `ITEM3` int(11) DEFAULT NULL,
  `ITEM2` int(11) DEFAULT NULL,
  `ITEM4` int(11) DEFAULT NULL,
  `ITEM5` int(11) DEFAULT NULL,
  `DevReq` mediumtext,
  `DevApp` int(11) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `ReqtIndex` (`Num`)
) ENGINE=MyISAM AUTO_INCREMENT=72 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aspreqts`
--

LOCK TABLES `aspreqts` WRITE;
/*!40000 ALTER TABLE `aspreqts` DISABLE KEYS */;
INSERT INTO `aspreqts` VALUES (19,'ASP1.7','SIGMA SHALL provide its clients an on-demand (non-blocking) interface.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(14,'ASP1.4','SIGMA SHALL provide its clients feedback on moderated changes.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(16,'ASP1.5','SIGMA SHALL provide its clients a means to transition its records through work states.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(40,'ASP3.13','SIGMA SHALL implement client profiles to control access and regulate QoS to its clients.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(45,'ASP1.2','SIGMA SHALL provide its clients an HTML 4 compliant interface to create, review, revise and delete information.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(46,'ASP1.9','SIGMA SHALL provide its clients a full-text searching capability.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(47,'ASP1.8','SIGMA SHALL provide its clients a means to their content views.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(48,'ASP1.10','SIGMA SHALL provide its clients a means to manage requirements, documentation, milestones, product evaluations, issue tracking and technology transfer agreements.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(49,'ASP1.11','SIGMA SHALL provide an initial set of client views.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(50,'ASP1.12','SIGMA SHALL provide its clients a means to graphically and numerically pivot data.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(51,'ASP2.2','SIGMA SHALL provide a means to execute administrative functions on programmable intervals and events.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(52,'ASP2.4','SIGMA SHALL provide its clients job status notifications by email.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(53,'ASP3.1','SIGMA SHALL interface with ODBC compliant applications.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(54,'ASP3.2','SIGMA SHALL be assessable on the classified JWICS networks and unclassified open internet.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(55,'ASP3.4','SIGMA SHALL control client access through the exclusive use of PKI and federate attribute services.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(56,'ASP3.7','SIGMA SHALL be entirely implemented using open-source, MIT/GNU licensed software.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(57,'ASP3.10','SIGMA SHALL provide no less than 90% system availability (30 blocking days per year).',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(58,'ASP2.8','SIGMA SHALL provide its clients a means to ingest and retrieve MIME compatible files.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(59,'ASP4.4','SIGMA SHALL be hosted on a ISP that provides 24/7 operational support as defined by the Technology Transfer Agreement.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(60,'ASP4.5','SIGMA SHALL measure and retain ISP and job volumetrics.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(61,'ASP2.7','SIGMA SHALL provide a means to ingest information from cooperating services.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(62,'ASP1.15','SIGMA SHALL provide its clients a means to produce standalone HTML from client views.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(63,'ASP3.19','SIGMA SHALL provide its clients a means to selectively lock (block other clients) during record transactions.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(64,'ASP3.16','SIGMA SHALL log all client searches.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Does not provide.  Could add to roadmap.',NULL),(65,'ASP3.18','SIGMA SHALL provide a means to journal record change to selected tables for data recovery purposes.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(66,'ASP4.6','SIGMA SHALL implement machine learning jobs that build feature detector for panchromatic imagery.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(67,'ASP4.7','SIGMA SHALL implement machine learning jobs that build natural language parsing detectors.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'',NULL),(68,'ASP4.3','SIGMA SHALL index meta data from TFRD and NITF files when ingested to the host ISP file system.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Does not provide.  Could add to roadmap.',NULL),(69,'ASP2.10','SIGMA SHALL support Python, Java, JS, Matlab-like, OpenCV and C machine learning engines in stateless and statefull workflows.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Java engines have not been tested.',NULL),(70,'ASP1.3','SIGMA SHALL provide a means to automatically push its open-internet holdings to the classified JWICS network.',0,0,0,0,0,NULL,0,0,0,0,0,0,0,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Does not provide.  Could add to roadmap.',NULL),(71,'ASP2.1','SIGMA SHALL have a means to reflect GIT logs to its requirements tables',NULL,NULL,NULL,NULL,NULL,'stared config history  on Tue Oct 06 2015 14:09:35 GMT+0000 (UTC) by <a href=\'mailto:g5120089@trbvm.com\' >DEBE</a>',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `aspreqts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attrs`
--

DROP TABLE IF EXISTS `attrs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `attrs` (
  `INSERT` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `UPDATE` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `DELETE` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `SELECT` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `EXECUTE` varchar(32) DEFAULT NULL,
  `Special` mediumtext CHARACTER SET utf8,
  `Dataset` varchar(32) DEFAULT NULL,
  `ID` float NOT NULL AUTO_INCREMENT,
  `Expose` int(11) DEFAULT NULL,
  `Journal` int(11) DEFAULT '0',
  `Log` int(11) DEFAULT '1',
  `Flatten` int(11) DEFAULT '0',
  `Unsafeok` int(11) DEFAULT '0',
  `Trace` int(11) DEFAULT '0',
  `Tx` varchar(32) DEFAULT '',
  `Track` int(11) DEFAULT '0',
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attrs`
--

LOCK TABLES `attrs` WRITE;
/*!40000 ALTER TABLE `attrs` DISABLE KEYS */;
INSERT INTO `attrs` VALUES ('Admin<sup>4</sup>','Admin<sup>4</sup>','Admin<sup>4</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','Role allocation table','roles',15,1,1,1,0,0,1,'openv.roles',0),('Stakeholder<sup>4</sup>','Stakeholder<sup>4</sup>','Stakeholder<sup>4</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','List of algorithm sensor/Visitor interface specifications (aka file types)','aspreqts',19,1,1,1,0,0,1,'openv.aspreqts',0),('Stakeholder<sup>4</sup>','Stakeholder<sup>2</sup>','Admin<sup>3</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','This grid is used to track site usage issues (NOT new requirements).  Typical issues include GUI use, site layout, etc.','issues',21,1,1,1,0,0,1,'openv.issues',0),('Stakeholder<sup>3</sup>','Stakeholder<sup>1</sup>','Stakeholder<sup>4</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','Feel free to modify this news grid as you think necessary.  Remember there is no anonymity, so please try to keep your news relevant and accurate.','news',24,1,1,1,0,0,1,'',1),('Creator<sup>4</sup>','Developer<sup>3</sup>','Creator<sup>4</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','Sideline area to define unmoderated requirements and general algorithm information.','tta',33,1,1,1,0,0,1,'openv.tta',0),('Creator<sup>4</sup>','Developer<sup>3</sup>','Creator<sup>4</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','','intake',35,1,1,1,0,0,1,'openv.intake',0),('Admin<sup>5</sup>','Stakeholder<sup>3</sup>','Admin<sup>5</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','','queues',39,1,1,1,0,0,1,'',0),('Stakeholder<sup>5</sup>','Stakeholder<sup>4</sup>','Stakeholder<sup>5</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','FSGALAM requirements are tracked here.','ispreqts',42,1,1,1,0,0,1,'openv.ispreqts',0),('Admin<sup>4</sup>','Admin<sup>4</sup>','Admin<sup>4</sup>','Visitor<sup>0</sup>','Moderator<sup>0</sup>','Parameter allocation table','parms',46,1,1,1,0,0,1,'',0),(NULL,NULL,NULL,NULL,NULL,NULL,'milestones',47,NULL,1,1,0,0,1,'openv.milestones',0),(NULL,NULL,NULL,NULL,NULL,NULL,'catalog',48,NULL,1,1,0,1,1,'',1),(NULL,NULL,NULL,NULL,NULL,NULL,'journal',49,NULL,0,1,0,0,0,'openv.journal',0),(NULL,NULL,NULL,NULL,NULL,NULL,'moderators',50,NULL,0,1,0,0,0,'openv.hawks',0);
/*!40000 ALTER TABLE `attrs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hawks`
--

DROP TABLE IF EXISTS `hawks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hawks` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Hawk` varchar(16) DEFAULT NULL,
  `Dataset` varchar(32) DEFAULT NULL,
  `Field` varchar(32) DEFAULT NULL,
  `Power` int(11) DEFAULT '0',
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `KeyID` (`Hawk`,`Dataset`,`Field`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hawks`
--

LOCK TABLES `hawks` WRITE;
/*!40000 ALTER TABLE `hawks` DISABLE KEYS */;
INSERT INTO `hawks` VALUES (1,'PM','news','Stay',1),(2,'D','news','Stay',3),(3,'Chief','news','Stay',2),(4,'BigDog','news','To',2),(7,'PM','news','To',1),(8,'PM','milestones','Gov',1);
/*!40000 ALTER TABLE `hawks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hwreqts`
--

DROP TABLE IF EXISTS `hwreqts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `hwreqts` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Phase` varchar(32) DEFAULT NULL,
  `VMs` int(11) DEFAULT NULL,
  `OS` varchar(32) DEFAULT NULL,
  `RAM` int(11) DEFAULT NULL,
  `Disk` int(11) DEFAULT NULL,
  `JWICS` int(11) DEFAULT NULL,
  `SBU` int(11) DEFAULT NULL,
  `RDT` int(11) DEFAULT NULL,
  `NMIS` int(11) DEFAULT NULL,
  `UMIS` int(11) DEFAULT NULL,
  `ECDS` int(11) DEFAULT NULL,
  `DTA` int(11) DEFAULT NULL,
  `DevReq` mediumtext,
  `ISP` varchar(32) DEFAULT NULL,
  `ADM` int(11) DEFAULT NULL,
  `OMAR` int(11) DEFAULT NULL,
  `HYDRA` int(11) DEFAULT NULL,
  `SMTP` int(11) DEFAULT NULL,
  `Cores` int(11) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hwreqts`
--

LOCK TABLES `hwreqts` WRITE;
/*!40000 ALTER TABLE `hwreqts` DISABLE KEYS */;
INSERT INTO `hwreqts` VALUES (1,'1',1,'Centos 6.5',32,32,0,0,0,0,0,NULL,0,NULL,'AWS',1,1,1,1,12),(2,'2',4,'Centos 6.5',32,32,0,0,0,0,0,NULL,0,NULL,'AWS',1,1,1,1,8),(3,'1',1,'Centos 6.5',32,32,0,0,0,0,0,NULL,0,NULL,'AWS',1,1,1,1,4);
/*!40000 ALTER TABLE `hwreqts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ispreqts`
--

DROP TABLE IF EXISTS `ispreqts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ispreqts` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `ByInspect` int(11) DEFAULT NULL,
  `ByAnalysis` int(11) DEFAULT NULL,
  `ByDemo` int(11) DEFAULT NULL,
  `ByTest` int(11) DEFAULT NULL,
  `Special` mediumtext,
  `Reqt` mediumtext,
  `Num` varchar(32) DEFAULT '',
  `GEOHUB` int(11) DEFAULT '0',
  `ILE` int(11) DEFAULT '0',
  `ICITE` int(11) DEFAULT '0',
  `RDT` int(11) DEFAULT '0',
  `NGANET` int(11) DEFAULT '0',
  `BASELINE` int(11) DEFAULT '0',
  `NOWTIDE` int(11) DEFAULT '0',
  `Security` int(11) DEFAULT NULL,
  `Performance` int(11) DEFAULT NULL,
  `Storage` int(11) DEFAULT NULL,
  `EntExit` int(11) DEFAULT NULL,
  `Config` int(11) DEFAULT NULL,
  `Verification` int(11) DEFAULT NULL,
  `CSCF` int(11) DEFAULT NULL,
  `DevReq` mediumtext,
  `DevApp` int(11) DEFAULT NULL,
  `Network` int(11) DEFAULT NULL,
  `NRORDT` int(11) DEFAULT NULL,
  `RES1` int(11) DEFAULT NULL,
  `RES2` int(11) DEFAULT NULL,
  `RES3` int(11) DEFAULT NULL,
  `RES4` int(11) DEFAULT NULL,
  `RES5` int(11) DEFAULT NULL,
  `ILEAWSDG` int(11) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `ReqtIndex` (`Num`)
) ENGINE=MyISAM AUTO_INCREMENT=29 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ispreqts`
--

LOCK TABLES `ispreqts` WRITE;
/*!40000 ALTER TABLE `ispreqts` DISABLE KEYS */;
INSERT INTO `ispreqts` VALUES (1,0,0,1,0,NULL,'ISP SHALL provide SIGMA all PKI Trusted Authorities and Revocation Lists necessary to meet applicable Information Assurance Standards','ISP1.1',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(2,1,0,1,0,NULL,'ISP SHALL provide SIGMA as least 1 admin (privledged user) login.','ISP1.6',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(3,1,0,0,0,NULL,'ISP SHALL comply with all applicable OCIO Information Assurance Standards','ISP1.7',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(4,1,0,0,0,NULL,'ISP SHALL provide SIGMA agents who can: 1) virus scan supplied files, 2) transfer files to and between systems, 3) change VM configurations, and 4) manage ISP configuration change requests as directed by the ASP.','ISP1.8',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(5,0,1,0,1,NULL,'ISP SHALL provide SIGMA an average database response time of 2 milliseconds over all CRUD transactions.','ISP2.1',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(6,0,1,0,1,NULL,'ISP SHALL provide SIGMA client links whose average link transfer rate exceeds 20K bytes/second.','ISP2.2',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(7,0,1,0,1,NULL,'ISP SHALL provide SIGMA client links whose delay does not exceed 0.5 seconds.','ISP2.3',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(8,0,1,0,1,NULL,'ISP SHALL provide SIGMA a file archival/repo link with average transfer rate of 50 Gbytes/month.','ISP2.4',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(9,0,1,0,1,NULL,'ISP SHALL provide SIGMA no less than 98.5% system availability (5 down days per year) to its entire VM cluster','ISP2.6',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(10,1,0,0,0,NULL,'ISP SHALL provide SIGMA no less than TBD Gbytes of chip cache assesible to its VM cluster','ISP3.2',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(11,1,0,0,0,NULL,'ISP SHALL provide SIGMA no less than 32 Gbytes of persistant disk storage for client files.','ISP3.3',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(12,0,0,1,0,NULL,'ISP SHALL provide SIGMA full access to all SIGMA files.','ISP3.6',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(13,1,0,0,0,NULL,'ISP SHALL provide SIGMA the hardware configuration controlled by the HW Reqts herein.','ISP3.7',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(14,1,0,0,0,NULL,'ISP SHALL admit the SIGMA software configuration controlled by the SW Reqts herein.','ISP4.1',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(16,0,0,1,0,NULL,'ISP SHALL provide SIGMA an SMTP email service.','ISP4.8',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(17,0,0,1,0,NULL,'ISP SHALL provide SIGMA a GIT file repository service.','ISP4.11',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(18,0,0,1,0,NULL,'ISP SHALL provide SIGMA a federated authoritive attribute service providing detailed client information indexed by PKI credentials.','ISP4.12',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(19,1,0,1,0,NULL,'ISP SHALL provide SIGMA 5 FQDNs and 1 email address to interface with the networks identified in HW Reqts herein.','ISP5.3',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(20,1,0,1,0,NULL,'ISP SHALL provide SIGMA bidirectional UDP ports 8080, 8081, 8082, 8083, 22, 20, 3306, 3389.','ISP5.4',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(21,1,0,0,0,NULL,'ISP SHALL manange all IP addresses within and across the SIGMA VM cluster.','ISP5.5',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(22,0,0,1,0,NULL,'ISP SHALL manage all client SIGMA issues at the <a href=\"http:swag-ws-02.ec2.internal:8080/home.view\">SWAG service</a> via the issues/requirements/admin views.','ISP5.8',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(23,1,0,0,0,NULL,'ISP SHALL identify its representatives prior to SIGMA entering its operating environment.','ISP7.1',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,1),(24,1,0,0,0,NULL,'ISP SHALL disclose to SIGMA representatives any and all ISP requirements, certifications, and accrediations prior to SIGMA entering its operating environment.','ISP7.3',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(25,0,0,1,0,NULL,'ISP SHALL provide SIGMA an OGC(WMS/WFS) compliant image chipping service providing orthorectified, jpg images given lat-lon bounding box, viewport extend, and pixel dynamic range parameters..','ISP3.8',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(26,0,0,1,0,NULL,'ISP SHALL provide SIGMA WEBGL compatible interfaces for all SIGMA clients.','ISP4.3',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(27,0,0,1,0,NULL,'ISP SHALL provide SIGMA an AOI data tipping service.','ISP3.10',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL),(28,1,0,1,0,NULL,'ISP SHALL provide a facility assessible by USgov personal during normal buisness days and hours and equipped with desktop-ready computers having connectivity to the SIGMA VM cluster.','ISP5.9',0,0,0,0,0,0,0,0,0,0,0,0,NULL,0,'',NULL,0,0,0,0,0,0,0,NULL);
/*!40000 ALTER TABLE `ispreqts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `issues`
--

DROP TABLE IF EXISTS `issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `issues` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Issue` mediumtext CHARACTER SET utf8,
  `Severity` varchar(8) CHARACTER SET utf8 DEFAULT NULL,
  `Status` varchar(64) CHARACTER SET utf8 DEFAULT '',
  `Effort` varchar(64) CHARACTER SET utf8 DEFAULT NULL,
  `ECD` datetime DEFAULT NULL,
  `POC` varchar(64) CHARACTER SET utf8 DEFAULT NULL,
  `Pivot` int(11) DEFAULT NULL,
  `Form` int(11) DEFAULT NULL,
  `Grid` int(11) DEFAULT NULL,
  `Reqt` int(11) DEFAULT NULL,
  `GUI` int(11) DEFAULT NULL,
  `Plot` int(11) DEFAULT NULL,
  `Vis` int(11) DEFAULT NULL,
  `Action` mediumtext CHARACTER SET utf8,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=MyISAM AUTO_INCREMENT=123 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `issues`
--

LOCK TABLES `issues` WRITE;
/*!40000 ALTER TABLE `issues` DISABLE KEYS */;
INSERT INTO `issues` VALUES (2,'Return spell/NLP feedback from server to client grid.','High','Fixed','Low',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,'Added to Moderator view.'),(4,'No web crawling rules.<br>','High','Fixed','High',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,'Added visualization support (see skinning post with D3.jade and Chart) as illustrated in Status view.'),(6,'No visualization tools for pivots. &nbsp;<br>','Medium','Fixed','High',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,''),(7,'RowEditing plugin interferes will the CellEditing plugin.  Moreover CellEditing propagate *all* fields (changed and not) to the server, creating confusion for those reviewing the dblogs.','Low','Fixed','Medium',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,''),(8,'Add help to the help buttons','Low','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,''),(9,'Tooltips are loaded from Parm desciptions but they don’t display.','Low','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,'Please type a SPACE to end a multiselect.&nbsp;&nbsp;'),(10,'Record selector works only once and thereafter is ignored.','High','Fixed','Medium',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL),(11,'Grids in an initally closed state can be opened only once; should be able to toggle state.','Low','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL),(12,'Missing chat window (instant messaging) functionality to coordinate changes with other clients.<br>','Low','Fixed','High',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,'Added functionality.'),(31,'Checkboxes acting goofy. &nbsp;<br>','Low','Fixed','Low',NULL,NULL,NULL,1,NULL,NULL,1,NULL,NULL,NULL),(32,'Pivots cannot be filtered.&nbsp;<br>','Low','Open','High',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Known issue with ExtJS.'),(55,'Pivots cannot be live searched. &nbsp;<br>','Low','Open','High',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Known limitation with ExtJS.'),(56,'Site widgets do not conform to some unspecified standard. &nbsp;<br>','Low','Closed','N/A',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,'No known build standards have been identified for this service. &nbsp;See /requirements.view to specify.'),(59,'Multiple dynamic css menus are generated - one for each post area.','Low','Closed','N/A',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,'This is how its supposed to work.'),(60,'Sometimes columns dragging fails.&nbsp; F5 fixes.','Low','Fixed','Medium',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL),(61,'Cant add or remove sort columns.','Medium','Fixed','Medium',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,''),(62,'TRL lifecycle plot needs to get fixed (x axis and alg labels)','Low','Fixed','Medium',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL),(64,'Database errors in pivoted tables (e.g. during poorly formed insert,delete) are not announced to the client.<br>','Medium','Fixed','High',NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,''),(65,'Site widgets do not conform to some arbitrary, undefined standard.<br>','Low','Closed','N/A',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,''),(66,'Would be good to have search option on unlocked/unpivoted columns.<br>','Medium','Open','Medium',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,''),(67,'Comoboxes do not work in form. &nbsp;<br>','High','Fixed','High',NULL,NULL,NULL,1,NULL,NULL,1,NULL,NULL,'Largely fixed, however ... issues linger with the way certain browsers mark their form fields dirty.&nbsp; E.g. FF will mark some HTML fields dirty even when they have not been modified; while Chrome seems to work.&nbsp; This can be problematic as FF users will take on unintended roles when they make changes via forms.'),(79,'Infrastructure degraded by running this service','High','Closed','N/A',NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'This service shares infrastructure Health stats (see /ADMIN.db and /HEALTH.db) to its clients.'),(81,'There is no multimedia support. &nbsp;','Low','Fixed','High',NULL,NULL,0,0,0,0,0,NULL,0,'Added functionality and new requirement. &nbsp;Multimedia support (e.g. embedded pdfs) has been blocked due to various FF/Chrome plugin issues which cause the server to hang (after ~ 10 browser refreshes).'),(111,'Firefox not recognizing html editor in Jade skins that specify the \".h\" data type. &nbsp;Reverts to a textarea.','Medium','Open','High',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Known issue with Firefox. &nbsp;HTML editing does work in Chrome.'),(122,'New browsers are rejecting \"special\" characters (like \"!@#$%^&amp;*()\" and backspace) in \"text\" and \"textarea\" fields.','Low','Closed','Low',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'New browser standards disallow these \"special\" characters in \"text\" fields. Specify such fields as \".html\" to enable the use of these (and other) special characters.'),(117,'table, hbox, vob, etc are not working. &nbsp;need method to embed inline skins.','Medium','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'goto>inline update api/skinguide.  revert pos logic in sql.execute  on Fri Oct 09 2015 03:32:26 GMT+0000 (UTC) by <a href=\'mailto:g5120089@trbvm.com\' >DEBE</a>'),(116,'general bug fix','Medium','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'fixed low-level link logging bug.  added auto-grid-activity logic to grid help.  updated tutorial, skin and api.   on Fri Oct 09 2015 23:37:37 GMT+0000 (UTC) by <a href=\'mailto:g5120089@trbvm.com\' >DEBE</a>'),(115,'would like to see git history reflected to issues and other system tables','Low','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'fix git tracking.  again. fix sql.jobs and det execute VTL  on Tue Oct 06 2015 22:08:44 GMT+0000 (UTC) by <a href=\'mailto:g5120089@trbvm.com\' >DEBE</a>'),(114,'No web crawling rules.<br>','High','Fixed','High',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,'Added visualization support (see skinning post with D3.jade and Chart) as illustrated in Status view.'),(112,'Grids table with Crush option do not toggle correctly. &nbsp;','Low','Open','High',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Known bug with extjs'),(109,'<div>Chrome is placing left-right docked tabs to the bottom. &nbsp;</div>','Low','Open','Medium',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Known bugs with Chrome'),(107,'Firefox does not properly capture and image in the image viewers (eg minielt.view).','Low','Open','High',NULL,NULL,0,0,0,0,1,NULL,1,'<span style=\"font-family: \'Times New Roman\'; font-size: medium;\">&nbsp;Known issue with FF. Works in Chrome. Potential fix exists but needs considerable development support.</span>'),(118,'Grids in an initally closed state can be opened only once; should be able to toggle state.','Low','Fixed','Low',NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL),(119,'Would be nice if one could easily expose grid change log activity.','Low','Fixed','Medium',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'fixed low-level link logging bug.  added auto-grid-activity logic to grid help.  updated tutorial, skin and api.   on Fri Oct 09 2015 23:37:37 GMT+0000 (UTC) by <a href=\'mailto:g5120089@trbvm.com\' >DEBE</a>'),(121,'Firefox does not recognize the grid \"cell left/right shifts\" attribute or the \"context menu\" to push a grid record to a form.','Low','Closed','High',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Know issue with firefox. &nbsp;When using firefox, you must precisely right-click on a cell border to make the menu appear. &nbsp;Failing that, you can always use Chrome.');
/*!40000 ALTER TABLE `issues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journal`
--

DROP TABLE IF EXISTS `journal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `journal` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Dataset` varchar(64) DEFAULT NULL,
  `Field` varchar(64) DEFAULT NULL,
  `Hawk` varchar(16) DEFAULT NULL,
  `Updates` int(11) DEFAULT '1',
  `Power` int(11) DEFAULT '0',
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `KeyID` (`Dataset`,`Field`,`Hawk`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journal`
--

LOCK TABLES `journal` WRITE;
/*!40000 ALTER TABLE `journal` DISABLE KEYS */;
/*!40000 ALTER TABLE `journal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locks`
--

DROP TABLE IF EXISTS `locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `locks` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Lock` varchar(32) DEFAULT NULL,
  `Client` varchar(64) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locks`
--

LOCK TABLES `locks` WRITE;
/*!40000 ALTER TABLE `locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `locks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `milestones`
--

DROP TABLE IF EXISTS `milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `milestones` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `W0` mediumtext,
  `W1` mediumtext,
  `W2` mediumtext,
  `W3` mediumtext,
  `W4` mediumtext,
  `W5` mediumtext,
  `W6` mediumtext,
  `W7` mediumtext,
  `W8` mediumtext,
  `W9` mediumtext,
  `W10` mediumtext,
  `Task` varchar(255) DEFAULT NULL,
  `Hours` int(11) DEFAULT NULL,
  `Complete` float DEFAULT NULL,
  `SeqNum` varchar(32) DEFAULT NULL,
  `Num` float DEFAULT NULL,
  `W11` mediumtext,
  `W12` mediumtext,
  `W13` mediumtext,
  `W14` mediumtext,
  `W15` mediumtext,
  `W16` mediumtext,
  `W17` mediumtext,
  `W18` mediumtext,
  `W19` mediumtext,
  `ODBCstamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `milestones`
--

LOCK TABLES `milestones` WRITE;
/*!40000 ALTER TABLE `milestones` DISABLE KEYS */;
INSERT INTO `milestones` VALUES (17,'a0','','XXXXXX','a3','a4','a5','a6','a7','a8','a9','a10','wash my face',1,0.5,'1.2.3',1,'','','','','','','','','','2016-10-14 03:20:33'),(18,'b0','=B b1','XXXXXX','b3','b4','b5','b6','b7','b8','b9','b10','brush my teeth',10,0.2,'1.2.2',2,'','','','','','','','','','2016-10-14 03:20:33'),(19,'XXXXXX','c1','XXXXXX','c3','c4','c5','c6','c7','c8','','c10','comb my hair',4,0.1,'Deliverables',3,'','','','','','','','','','2016-10-14 03:20:33'),(20,'=R a0','abc','bbbbb','a3','a4','a5','a6','a7','a8','a9','a10','wash my face',NULL,NULL,'Deliverables',0.1,'','','','','','','','','','2016-10-14 03:20:33'),(21,'a0','=G def','aaaa','a3','a4','a5','a6','a7','a8','a9','a10','wash my face',NULL,NULL,'1.2.3',0.2,'','','','','','','','','','2016-10-14 03:20:33');
/*!40000 ALTER TABLE `milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `oplimits`
--

DROP TABLE IF EXISTS `oplimits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `oplimits` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Title` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `OEstrikes` int(11) DEFAULT '0',
  `OEgrace` int(11) DEFAULT '0',
  `OEPOC` varchar(128) CHARACTER SET utf8 DEFAULT '',
  `OEHTTPlimit` float DEFAULT '0',
  `OEHTTPSlimit` float DEFAULT '0',
  `OEDBlimit` float DEFAULT '0',
  `OEOHlimit` float DEFAULT '0',
  `OEconfig` int(11) DEFAULT '0',
  `Templimit` float DEFAULT '0',
  UNIQUE KEY `ID` (`ID`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `oplimits`
--

LOCK TABLES `oplimits` WRITE;
/*!40000 ALTER TABLE `oplimits` DISABLE KEYS */;
INSERT INTO `oplimits` VALUES (1,'Reqts Mgr',5,0,'whoever@this.org',400,400,40,30,1,0);
/*!40000 ALTER TABLE `oplimits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `profiles` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Client` varchar(128) DEFAULT NULL,
  `Likeus` int(11) DEFAULT '0',
  `Updated` datetime DEFAULT NULL,
  `Banned` mediumtext CHARACTER SET utf8,
  `Liked` int(11) DEFAULT '0',
  `Joined` datetime DEFAULT NULL,
  `SnapInterval` int(11) DEFAULT '0',
  `SnapCount` int(11) DEFAULT '0',
  `Charge` float DEFAULT NULL,
  `Credit` float DEFAULT NULL,
  `QoS` int(11) DEFAULT NULL,
  `Trusted` int(11) DEFAULT '0',
  `Captcha` int(11) DEFAULT '0',
  `Login` varchar(64) CHARACTER SET utf8 DEFAULT NULL,
  `Email` varchar(128) CHARACTER SET utf8 DEFAULT NULL,
  `Challenge` int(11) DEFAULT '0',
  `isHawk` int(11) DEFAULT NULL,
  `Requested` datetime DEFAULT NULL,
  `Approved` datetime DEFAULT NULL,
  `Group` varchar(32) DEFAULT NULL,
  `uid` varchar(32) DEFAULT NULL,
  `gid` varchar(32) DEFAULT NULL,
  `User` varchar(128) DEFAULT NULL,
  `Journal` int(11) DEFAULT NULL,
  `Message` mediumtext,
  `IDs` mediumtext,
  `Admin` mediumtext,
  `Repoll` int(11) DEFAULT '0',
  `Timeout` int(11) DEFAULT '0',
  `Roles` mediumtext,
  `Strength` int(11) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `User` (`User`),
  UNIQUE KEY `Client` (`Client`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profiles`
--

LOCK TABLES `profiles` WRITE;
/*!40000 ALTER TABLE `profiles` DISABLE KEYS */;
INSERT INTO `profiles` VALUES (34,'brian.james@guest.org',0,'2015-05-04 05:52:50','',1,'2015-09-28 20:51:50',NULL,NULL,NULL,0,0,0,0,NULL,NULL,0,1,NULL,NULL,'app1',NULL,NULL,'brian.james@guest.org',NULL,NULL,'{\"Login\":\"me\",\"Password\":\"test\",\"FavColor\":\"blue\"}','Please contact joeschome to unlock your accout',0,30000,'PM,R,X',1),(37,'selfsigned',NULL,NULL,NULL,NULL,'2015-09-28 20:51:50',NULL,NULL,NULL,0,0,0,0,NULL,NULL,0,1,NULL,NULL,'app1',NULL,NULL,'me@guest.org',NULL,'Hello there guest - riddle me this (riddle) and (riddle) and your (Birthdate) and (ids)','{\"Login\":\"me\",\"Password\":\"test\",\"FavColor\":\"blue\"}','Please contact joeschome to unlock your accout',0,30000,'',1),(41,'guest@guest.org',1,NULL,NULL,0,NULL,0,0,NULL,NULL,2,0,0,NULL,'guest',0,1,NULL,NULL,'app1',NULL,NULL,'guest@guest.org',NULL,NULL,'{\"Login\":\"me\",\"Password\":\"test\",\"FavColor\":\"blue\"}','Please contact joeschome to unlock your accout',0,30000,'R,PM',1),(42,'guest',0,NULL,'',0,NULL,0,0,0,100,1,0,0,NULL,NULL,1,NULL,NULL,NULL,'',NULL,NULL,'guest',NULL,'Welcome guest - what is (riddle)?',NULL,NULL,0,0,'R,X',1);
/*!40000 ALTER TABLE `profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `riddles`
--

DROP TABLE IF EXISTS `riddles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `riddles` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Client` varchar(64) DEFAULT NULL,
  `Attempts` int(11) DEFAULT '0',
  `maxAttempts` int(11) DEFAULT '5',
  `Riddle` mediumtext,
  `Made` datetime DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=467 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `riddles`
--

LOCK TABLES `riddles` WRITE;
/*!40000 ALTER TABLE `riddles` DISABLE KEYS */;
INSERT INTO `riddles` VALUES (1,'selfsigned',0,5,'7,9,me,test,blue','2016-06-21 22:25:29'),(2,'selfsigned',0,5,'9,7,me,test,blue','2016-06-21 22:36:09'),(3,'selfsigned',0,5,'9,9,me,test,blue','2016-06-21 22:37:49'),(4,'selfsigned',0,5,'2,7,me,test,blue','2016-06-21 23:33:58'),(5,'selfsigned',0,5,'9,2,me,test,blue','2016-06-21 23:35:07'),(6,'selfsigned',0,5,'9,9,me,test,blue','2016-06-21 23:41:48'),(7,'selfsigned',0,5,'9,7,me,test,blue','2016-06-22 00:00:49'),(8,'selfsigned',0,5,'9,9,me,test,blue','2016-06-22 00:02:17'),(9,'selfsigned',0,5,'9,7,me,test,blue','2016-06-22 00:47:45'),(10,'selfsigned',0,5,'7,7,me,test,blue','2016-06-22 00:53:09'),(11,'selfsigned',0,5,'9,2,me,test,blue','2016-06-22 00:54:24'),(12,'selfsigned',0,5,'9,9,me,test,blue','2016-06-22 00:55:17'),(13,'selfsigned',0,5,'7,7,me,test,blue','2016-06-22 00:58:31'),(14,'selfsigned',0,5,'2,7,me,test,blue','2016-06-22 01:00:39'),(15,'selfsigned',0,5,'9,9,me,test,blue','2016-06-22 01:01:12'),(16,'selfsigned',0,5,'2,2,me,test,blue','2016-06-22 01:02:31'),(17,'selfsigned',0,5,'4,3,me,test,blue','2016-06-22 01:06:01'),(18,'selfsigned',0,5,'13,58,me,test,blue','2016-06-22 01:07:32'),(20,'selfsigned',0,5,'3,8,me,test,blue','2016-06-22 21:31:47'),(21,'selfsigned',0,5,'27,2,me,test,blue','2016-06-22 21:32:22'),(22,'selfsigned',0,5,'8,37,me,test,blue','2016-06-23 09:53:41'),(23,'selfsigned',0,5,'26,4,me,test,blue','2016-06-23 09:55:49'),(24,'selfsigned',0,5,'3,6,me,test,blue','2016-06-23 09:56:06'),(25,'selfsigned',0,5,'9,9,me,test,blue','2016-06-23 12:47:51'),(26,'selfsigned',0,5,'4,69,me,test,blue','2016-06-23 12:49:45'),(27,'selfsigned',0,5,'6,6,me,test,blue','2016-06-23 12:54:50'),(29,'selfsigned',0,5,'25,12,me,test,blue','2016-06-23 13:03:28'),(30,'selfsigned',0,5,'6,6,me,test,blue','2016-06-23 13:08:59'),(31,'selfsigned',0,5,'6,3,me,test,blue','2016-06-23 13:16:37'),(32,'selfsigned',0,5,'3,6,me,test,blue','2016-06-23 13:17:37'),(33,'selfsigned',0,5,'3,6,me,test,blue','2016-06-23 13:18:57'),(34,'selfsigned',0,5,'63,6,me,test,blue','2016-06-23 13:20:09'),(35,'selfsigned',0,5,'63,63,me,test,blue','2016-06-23 13:46:43'),(36,'selfsigned',0,5,'2,40,me,test,blue','2016-06-23 13:48:12'),(37,'selfsigned',0,5,'18,29,me,test,blue','2016-06-23 13:49:16'),(38,'selfsigned',5,5,'45,57,me,test,blue','2016-06-23 13:50:24'),(39,'selfsigned',1,5,'21,65,me,test,blue','2016-06-23 13:55:12'),(40,'selfsigned',1,5,'31,31,me,test,blue','2016-06-23 14:03:08'),(42,'selfsigned',0,5,'','2016-06-23 14:32:59'),(43,'selfsigned',0,5,'','2016-06-23 14:37:24'),(44,'selfsigned',0,5,'','2016-06-23 14:37:29'),(45,'selfsigned',0,5,'','2016-06-23 14:37:30'),(46,'selfsigned',0,5,'','2016-06-23 14:37:30'),(47,'selfsigned',0,5,'','2016-06-23 14:37:31'),(48,'selfsigned',0,5,'','2016-06-23 14:37:31'),(49,'selfsigned',0,5,'','2016-06-23 14:37:31'),(50,'selfsigned',0,5,'','2016-06-23 14:37:32'),(51,'selfsigned',0,5,'','2016-06-23 14:37:32'),(52,'selfsigned',0,5,'','2016-06-23 14:37:32'),(53,'selfsigned',0,5,'','2016-06-23 14:37:33'),(54,'selfsigned',0,5,'','2016-06-23 14:37:33'),(55,'selfsigned',0,5,'','2016-06-23 14:37:33'),(56,'selfsigned',0,5,'','2016-06-23 14:37:33'),(57,'selfsigned',0,5,'','2016-06-23 14:37:34'),(58,'selfsigned',0,5,'','2016-06-23 14:37:34'),(59,'selfsigned',0,5,'','2016-06-23 14:37:34'),(60,'selfsigned',0,5,'','2016-06-23 14:37:35'),(61,'selfsigned',0,5,'','2016-06-23 14:37:35'),(62,'selfsigned',0,5,'','2016-06-23 14:37:35'),(63,'selfsigned',0,5,'','2016-06-23 14:37:35'),(64,'selfsigned',0,5,'','2016-06-23 14:38:58'),(65,'selfsigned',0,5,'','2016-06-23 14:38:59'),(66,'selfsigned',0,5,'','2016-06-23 14:38:59'),(67,'selfsigned',0,5,'','2016-06-23 14:39:00'),(68,'selfsigned',0,5,'','2016-06-23 14:39:00'),(69,'selfsigned',0,5,'','2016-06-23 14:39:01'),(70,'selfsigned',0,5,'','2016-06-23 14:39:03'),(71,'selfsigned',0,5,'','2016-06-23 14:40:24'),(72,'selfsigned',0,5,'','2016-06-23 14:41:52'),(73,'selfsigned',0,5,'','2016-06-23 14:41:53'),(74,'selfsigned',0,5,'','2016-06-23 14:41:54'),(75,'selfsigned',0,5,'','2016-06-23 14:41:54'),(76,'selfsigned',0,5,'','2016-06-23 14:41:55'),(77,'selfsigned',0,5,'','2016-06-23 14:43:19'),(78,'selfsigned',0,5,'','2016-06-23 14:47:21'),(79,'selfsigned',0,5,'','2016-06-23 14:48:18'),(80,'selfsigned',0,5,'','2016-06-23 14:48:52'),(81,'selfsigned',0,5,'','2016-06-23 14:51:06'),(82,'selfsigned',0,5,'','2016-06-23 14:55:14'),(83,'selfsigned',0,5,'','2016-06-23 14:55:26'),(84,'selfsigned',0,5,'','2016-06-23 15:01:29'),(85,'selfsigned',0,5,'','2016-06-23 15:01:43'),(86,'selfsigned',0,5,'','2016-06-23 15:05:58'),(87,'selfsigned',0,5,'','2016-06-23 15:07:16'),(88,'selfsigned',0,5,'','2016-06-23 15:07:28'),(89,'selfsigned',0,5,'','2016-06-23 15:17:08'),(90,'selfsigned',0,5,'','2016-06-23 17:51:46'),(91,'selfsigned',0,5,'','2016-06-23 17:52:04'),(92,'selfsigned',0,5,'','2016-06-23 17:52:32'),(93,'selfsigned',0,5,'','2016-06-23 17:52:39'),(94,'selfsigned',0,5,'','2016-06-23 17:53:06'),(95,'selfsigned',0,5,'','2016-06-23 17:54:07'),(96,'selfsigned',0,5,'','2016-06-23 17:54:36'),(97,'selfsigned',0,5,'','2016-06-23 17:54:50'),(98,'selfsigned',0,5,'','2016-06-23 17:54:50'),(99,'selfsigned',0,5,'','2016-06-23 17:54:53'),(100,'selfsigned',0,5,'','2016-06-23 17:54:53'),(101,'selfsigned',0,5,'','2016-06-23 17:54:53'),(102,'selfsigned',0,5,'','2016-06-23 17:54:54'),(103,'selfsigned',0,5,'','2016-06-24 10:41:02'),(104,'selfsigned',0,5,'','2016-06-24 10:45:23'),(105,'selfsigned',0,5,'','2016-06-24 10:45:59'),(106,'selfsigned',0,5,'','2016-06-24 10:46:36'),(107,'selfsigned',0,5,'','2016-06-24 10:46:36'),(108,'selfsigned',0,5,'','2016-06-24 10:46:37'),(109,'selfsigned',0,5,'','2016-06-24 10:46:42'),(110,'selfsigned',0,5,'','2016-06-24 10:46:42'),(111,'selfsigned',0,5,'','2016-06-24 10:46:43'),(112,'selfsigned',0,5,'','2016-06-24 10:46:43'),(113,'selfsigned',0,5,'','2016-06-24 10:48:12'),(114,'selfsigned',0,5,'','2016-06-24 10:48:40'),(115,'selfsigned',0,5,'','2016-06-24 10:49:07'),(116,'selfsigned',0,5,'','2016-06-24 10:49:44'),(117,'selfsigned',0,5,'','2016-06-24 10:49:53'),(118,'selfsigned',0,5,'','2016-06-24 10:49:54'),(119,'selfsigned',0,5,'','2016-06-24 10:49:54'),(120,'selfsigned',0,5,'','2016-06-24 10:49:54'),(121,'selfsigned',0,5,'','2016-06-24 10:49:54'),(122,'selfsigned',0,5,'','2016-06-24 10:49:55'),(123,'selfsigned',0,5,'','2016-06-24 10:51:12'),(124,'selfsigned',0,5,'','2016-06-24 10:51:15'),(125,'selfsigned',0,5,'','2016-06-24 10:51:17'),(126,'selfsigned',0,5,'','2016-06-24 11:57:12'),(127,'selfsigned',0,5,'','2016-06-24 12:09:21'),(128,'selfsigned',0,5,'','2016-06-24 12:10:09'),(129,'selfsigned',0,5,'','2016-06-24 12:25:37'),(130,'selfsigned',0,5,'','2016-06-24 12:29:25'),(131,'selfsigned',0,5,'','2016-06-24 12:32:38'),(132,'selfsigned',0,5,'','2016-06-24 12:33:03'),(133,'selfsigned',0,5,'','2016-06-24 12:33:46'),(134,'selfsigned',0,5,'','2016-06-24 12:33:46'),(135,'selfsigned',0,5,'','2016-06-24 12:33:47'),(136,'selfsigned',0,5,'','2016-06-24 12:33:47'),(137,'selfsigned',0,5,'','2016-06-24 12:33:47'),(138,'selfsigned',0,5,'','2016-06-24 12:33:48'),(139,'selfsigned',0,5,'','2016-06-25 08:35:58'),(140,'selfsigned',0,5,'','2016-06-25 08:36:08'),(141,'selfsigned',0,5,'','2016-06-25 08:50:36'),(142,'selfsigned',0,5,'','2016-06-25 08:50:40'),(143,'selfsigned',0,5,'','2016-06-25 08:50:42'),(144,'selfsigned',0,5,'','2016-06-25 08:50:47'),(145,'selfsigned',0,5,'','2016-06-25 08:50:47'),(146,'selfsigned',0,5,'','2016-06-25 08:50:47'),(147,'selfsigned',0,5,'','2016-06-25 08:50:48'),(148,'selfsigned',0,5,'','2016-06-25 08:50:49'),(149,'selfsigned',0,5,'','2016-06-25 08:50:49'),(150,'selfsigned',0,5,'','2016-06-25 08:51:37'),(151,'selfsigned',0,5,'','2016-06-25 08:52:15'),(152,'selfsigned',0,5,'','2016-06-25 08:52:21'),(153,'selfsigned',0,5,'','2016-06-25 08:52:28'),(154,'selfsigned',0,5,'','2016-06-25 08:52:50'),(155,'selfsigned',0,5,'','2016-06-25 08:52:51'),(156,'selfsigned',0,5,'','2016-06-25 08:52:51'),(157,'selfsigned',0,5,'','2016-06-25 08:52:51'),(158,'selfsigned',0,5,'','2016-06-25 08:52:51'),(159,'selfsigned',0,5,'','2016-06-25 08:52:51'),(160,'selfsigned',0,5,'','2016-06-25 08:54:58'),(161,'selfsigned',0,5,'','2016-06-25 08:55:31'),(162,'selfsigned',0,5,'','2016-06-25 08:55:35'),(163,'selfsigned',0,5,'','2016-06-25 08:55:37'),(164,'selfsigned',0,5,'','2016-06-25 08:55:43'),(165,'selfsigned',0,5,'','2016-06-25 08:55:43'),(166,'selfsigned',0,5,'','2016-06-25 08:55:44'),(167,'selfsigned',0,5,'','2016-06-25 08:59:24'),(168,'selfsigned',0,5,'','2016-06-25 08:59:36'),(169,'selfsigned',0,5,'','2016-06-25 09:00:01'),(170,'selfsigned',0,5,'','2016-06-25 10:34:41'),(171,'selfsigned',0,5,'','2016-06-25 10:34:47'),(172,'selfsigned',0,5,'','2016-06-25 10:34:47'),(173,'selfsigned',0,5,'','2016-06-25 10:34:47'),(174,'selfsigned',0,5,'','2016-06-25 10:34:49'),(175,'selfsigned',0,5,'','2016-06-25 10:34:51'),(176,'selfsigned',0,5,'','2016-06-25 10:34:51'),(177,'selfsigned',0,5,'','2016-06-25 10:34:52'),(178,'selfsigned',0,5,'','2016-06-25 10:34:54'),(179,'selfsigned',0,5,'','2016-06-25 10:34:54'),(180,'selfsigned',0,5,'','2016-06-25 10:34:55'),(181,'selfsigned',0,5,'','2016-06-25 10:34:55'),(182,'selfsigned',0,5,'','2016-06-25 10:35:01'),(183,'selfsigned',0,5,'','2016-06-25 10:35:02'),(184,'selfsigned',0,5,'','2016-06-25 10:35:02'),(185,'selfsigned',0,5,'','2016-06-25 10:35:02'),(186,'selfsigned',0,5,'','2016-06-25 10:35:04'),(187,'selfsigned',0,5,'','2016-06-25 10:35:09'),(188,'selfsigned',0,5,'','2016-06-25 10:35:10'),(189,'selfsigned',0,5,'','2016-06-25 10:35:11'),(190,'selfsigned',0,5,'','2016-06-25 10:35:11'),(191,'selfsigned',0,5,'','2016-06-25 10:35:11'),(192,'selfsigned',0,5,'','2016-06-25 10:35:15'),(193,'selfsigned',0,5,'','2016-06-25 10:35:19'),(194,'selfsigned',0,5,'','2016-06-25 10:35:19'),(195,'selfsigned',0,5,'','2016-06-25 10:35:20'),(196,'selfsigned',0,5,'','2016-06-25 10:35:20'),(197,'selfsigned',0,5,'','2016-06-25 10:35:26'),(198,'selfsigned',0,5,'','2016-06-25 10:35:27'),(199,'selfsigned',0,5,'','2016-06-25 10:35:28'),(200,'selfsigned',0,5,'','2016-06-25 10:35:35'),(201,'selfsigned',0,5,'','2016-06-25 10:35:55'),(202,'selfsigned',0,5,'','2016-06-25 10:36:09'),(203,'selfsigned',0,5,'','2016-06-25 10:36:17'),(204,'selfsigned',0,5,'','2016-06-25 10:36:21'),(205,'selfsigned',0,5,'','2016-06-25 10:36:24'),(206,'selfsigned',0,5,'','2016-06-25 10:36:24'),(207,'selfsigned',0,5,'','2016-06-25 10:36:24'),(208,'selfsigned',0,5,'','2016-06-25 10:36:26'),(209,'selfsigned',0,5,'','2016-06-25 10:36:26'),(210,'selfsigned',0,5,'','2016-06-25 10:36:27'),(211,'selfsigned',0,5,'','2016-06-25 10:36:28'),(212,'selfsigned',0,5,'','2016-06-25 10:36:29'),(213,'selfsigned',0,5,'','2016-06-25 10:36:30'),(214,'selfsigned',0,5,'','2016-06-25 10:36:30'),(215,'selfsigned',0,5,'','2016-06-25 10:36:31'),(216,'selfsigned',0,5,'','2016-06-25 10:36:32'),(217,'selfsigned',0,5,'','2016-06-25 10:36:33'),(218,'selfsigned',0,5,'','2016-06-25 10:36:34'),(219,'selfsigned',0,5,'','2016-06-25 10:36:35'),(220,'selfsigned',0,5,'','2016-06-25 10:37:53'),(221,'selfsigned',0,5,'','2016-06-25 10:37:55'),(222,'selfsigned',0,5,'','2016-06-25 10:37:55'),(223,'selfsigned',0,5,'','2016-06-25 10:37:56'),(224,'selfsigned',0,5,'','2016-06-25 10:37:56'),(225,'selfsigned',0,5,'','2016-06-25 10:37:58'),(226,'selfsigned',0,5,'','2016-06-25 10:39:18'),(227,'selfsigned',0,5,'','2016-06-25 10:39:19'),(228,'selfsigned',0,5,'','2016-06-25 10:40:44'),(229,'selfsigned',0,5,'','2016-06-25 10:40:44'),(230,'selfsigned',0,5,'','2016-06-25 10:42:15'),(231,'selfsigned',0,5,'','2016-06-25 10:42:17'),(232,'selfsigned',0,5,'','2016-06-25 10:42:18'),(233,'selfsigned',0,5,'','2016-06-25 10:42:18'),(234,'selfsigned',0,5,'','2016-06-25 10:42:19'),(235,'selfsigned',0,5,'','2016-06-25 10:43:40'),(236,'selfsigned',0,5,'','2016-06-25 10:43:41'),(237,'selfsigned',0,5,'','2016-06-25 10:43:52'),(238,'selfsigned',0,5,'','2016-06-25 10:43:53'),(239,'selfsigned',0,5,'','2016-06-25 10:43:53'),(240,'selfsigned',0,5,'','2016-06-25 10:47:43'),(241,'selfsigned',0,5,'','2016-06-25 10:47:50'),(242,'selfsigned',0,5,'','2016-06-25 10:47:53'),(243,'selfsigned',0,5,'','2016-06-25 10:47:56'),(244,'selfsigned',0,5,'','2016-06-25 10:47:57'),(245,'selfsigned',0,5,'','2016-06-25 10:47:58'),(246,'selfsigned',0,5,'','2016-06-25 10:48:00'),(247,'selfsigned',0,5,'','2016-06-25 10:48:00'),(248,'selfsigned',0,5,'','2016-06-25 10:48:01'),(249,'selfsigned',0,5,'','2016-06-25 10:48:02'),(250,'selfsigned',0,5,'','2016-06-25 10:49:18'),(251,'selfsigned',0,5,'','2016-06-25 10:49:19'),(252,'selfsigned',0,5,'','2016-06-25 10:49:20'),(253,'selfsigned',0,5,'','2016-06-25 10:49:20'),(254,'selfsigned',0,5,'','2016-06-25 10:49:20'),(255,'selfsigned',0,5,'','2016-06-25 10:49:20'),(256,'selfsigned',0,5,'','2016-06-25 10:50:53'),(257,'selfsigned',0,5,'','2016-06-25 10:51:23'),(258,'selfsigned',0,5,'','2016-06-25 10:51:45'),(259,'selfsigned',0,5,'','2016-06-25 10:52:59'),(260,'selfsigned',0,5,'','2016-06-25 10:53:37'),(261,'selfsigned',0,5,'','2016-06-25 10:54:41'),(262,'selfsigned',0,5,'','2016-06-25 10:59:23'),(263,'selfsigned',0,5,'','2016-06-25 10:59:43'),(264,'selfsigned',0,5,'','2016-06-25 11:00:51'),(265,'selfsigned',0,5,'','2016-06-25 11:01:12'),(266,'selfsigned',0,5,'','2016-06-25 11:01:45'),(267,'selfsigned',0,5,'','2016-06-25 11:02:27'),(268,'selfsigned',0,5,'','2016-06-25 11:02:38'),(269,'selfsigned',0,5,'','2016-06-25 11:02:50'),(270,'selfsigned',0,5,'','2016-06-25 11:03:01'),(271,'selfsigned',0,5,'','2016-06-25 11:08:12'),(272,'selfsigned',0,5,'','2016-06-25 11:08:29'),(273,'selfsigned',0,5,'','2016-06-25 11:08:41'),(274,'selfsigned',0,5,'','2016-06-25 11:09:08'),(275,'selfsigned',0,5,'','2016-06-25 11:09:53'),(276,'selfsigned',0,5,'','2016-06-25 11:11:55'),(277,'selfsigned',0,5,'','2016-06-25 11:12:16'),(278,'selfsigned',0,5,'','2016-06-25 11:12:29'),(279,'selfsigned',0,5,'','2016-06-25 13:46:08'),(280,'selfsigned',0,5,'','2016-06-25 13:46:53'),(281,'selfsigned',0,5,'','2016-06-25 13:47:05'),(282,'selfsigned',0,5,'','2016-06-25 13:47:30'),(283,'selfsigned',0,5,'','2016-06-25 13:47:42'),(284,'selfsigned',0,5,'','2016-06-25 13:48:13'),(285,'selfsigned',0,5,'','2016-06-25 13:48:32'),(286,'selfsigned',0,5,'','2016-06-25 13:48:58'),(287,'selfsigned',0,5,'','2016-06-25 13:49:34'),(288,'selfsigned',0,5,'','2016-06-25 13:49:40'),(289,'selfsigned',0,5,'','2016-06-25 13:49:49'),(290,'selfsigned',0,5,'','2016-06-25 13:49:50'),(291,'selfsigned',0,5,'','2016-06-25 13:49:50'),(292,'selfsigned',0,5,'','2016-06-25 13:49:50'),(293,'selfsigned',0,5,'','2016-06-25 13:49:50'),(294,'selfsigned',0,5,'','2016-06-25 13:49:50'),(295,'selfsigned',0,5,'','2016-06-25 13:51:23'),(296,'selfsigned',0,5,'','2016-06-25 13:51:38'),(297,'selfsigned',0,5,'','2016-06-25 13:51:39'),(298,'selfsigned',0,5,'','2016-06-25 13:51:43'),(299,'selfsigned',0,5,'','2016-06-25 13:51:46'),(300,'selfsigned',0,5,'','2016-06-25 13:51:46'),(301,'selfsigned',0,5,'','2016-06-25 13:51:46'),(302,'selfsigned',0,5,'','2016-06-25 13:51:47'),(303,'selfsigned',0,5,'','2016-06-25 13:52:54'),(304,'selfsigned',0,5,'','2016-06-25 13:53:15'),(305,'selfsigned',0,5,'','2016-06-25 13:53:15'),(306,'selfsigned',0,5,'','2016-06-25 13:53:22'),(307,'selfsigned',0,5,'','2016-06-25 13:53:27'),(308,'selfsigned',0,5,'','2016-06-25 13:53:27'),(309,'selfsigned',0,5,'','2016-06-25 13:53:27'),(310,'selfsigned',0,5,'','2016-06-25 13:53:28'),(311,'selfsigned',0,5,'','2016-06-25 13:56:57'),(312,'selfsigned',0,5,'','2016-06-25 13:57:18'),(313,'selfsigned',0,5,'','2016-06-25 13:57:19'),(314,'selfsigned',0,5,'','2016-06-25 13:57:27'),(315,'selfsigned',0,5,'','2016-06-25 13:57:30'),(316,'selfsigned',0,5,'','2016-06-25 13:57:31'),(317,'selfsigned',0,5,'','2016-06-25 13:57:31'),(318,'selfsigned',0,5,'','2016-06-25 13:57:32'),(319,'selfsigned',0,5,'','2016-06-25 14:01:02'),(320,'selfsigned',0,5,'','2016-06-25 14:01:16'),(321,'selfsigned',0,5,'','2016-06-25 14:01:18'),(322,'selfsigned',0,5,'','2016-06-25 14:01:22'),(323,'selfsigned',0,5,'','2016-06-25 14:01:22'),(324,'selfsigned',0,5,'','2016-06-25 14:01:22'),(325,'selfsigned',0,5,'','2016-06-25 14:01:25'),(326,'selfsigned',0,5,'','2016-06-25 14:01:35'),(327,'selfsigned',0,5,'','2016-06-25 14:02:33'),(328,'selfsigned',0,5,'','2016-06-25 14:02:54'),(329,'selfsigned',0,5,'','2016-06-25 14:02:56'),(330,'selfsigned',0,5,'','2016-06-25 14:02:58'),(331,'selfsigned',0,5,'','2016-06-25 14:02:58'),(332,'selfsigned',0,5,'','2016-06-25 14:02:58'),(333,'selfsigned',0,5,'','2016-06-25 14:02:59'),(334,'selfsigned',0,5,'','2016-06-25 14:02:59'),(335,'selfsigned',0,5,'','2016-06-25 14:19:51'),(336,'selfsigned',0,5,'','2016-06-25 14:20:05'),(337,'selfsigned',0,5,'','2016-06-25 14:20:07'),(338,'selfsigned',0,5,'','2016-06-25 14:20:07'),(339,'selfsigned',0,5,'','2016-06-25 14:20:08'),(340,'selfsigned',0,5,'','2016-06-25 14:20:32'),(341,'selfsigned',0,5,'','2016-06-25 14:20:32'),(342,'selfsigned',0,5,'','2016-06-25 14:20:32'),(343,'selfsigned',0,5,'','2016-06-25 14:21:59'),(344,'selfsigned',0,5,'','2016-06-25 14:22:15'),(345,'selfsigned',0,5,'','2016-06-25 14:22:31'),(346,'selfsigned',0,5,'','2016-06-25 14:22:37'),(347,'selfsigned',0,5,'','2016-06-25 14:22:37'),(348,'selfsigned',0,5,'','2016-06-25 14:22:38'),(349,'selfsigned',0,5,'','2016-06-25 14:22:38'),(350,'selfsigned',0,5,'','2016-06-25 14:22:39'),(351,'selfsigned',0,5,'','2016-06-25 14:24:50'),(352,'selfsigned',0,5,'','2016-06-25 14:25:14'),(353,'selfsigned',0,5,'','2016-06-25 14:25:23'),(354,'selfsigned',0,5,'','2016-06-25 14:25:24'),(355,'selfsigned',0,5,'','2016-06-25 14:25:24'),(356,'selfsigned',0,5,'','2016-06-25 14:25:35'),(357,'selfsigned',0,5,'','2016-06-25 14:25:36'),(358,'selfsigned',0,5,'','2016-06-25 14:25:37'),(359,'selfsigned',0,5,'','2016-06-25 14:26:10'),(360,'selfsigned',0,5,'','2016-06-25 14:26:26'),(361,'selfsigned',0,5,'','2016-06-25 14:26:40'),(362,'selfsigned',0,5,'','2016-06-25 14:26:51'),(363,'selfsigned',0,5,'','2016-06-25 14:26:51'),(364,'selfsigned',0,5,'','2016-06-25 14:26:51'),(365,'selfsigned',0,5,'','2016-06-25 14:26:52'),(366,'selfsigned',0,5,'','2016-06-25 14:26:52'),(367,'selfsigned',0,5,'','2016-06-25 14:27:18'),(368,'selfsigned',0,5,'','2016-06-25 14:27:34'),(369,'selfsigned',0,5,'','2016-06-25 14:27:36'),(370,'selfsigned',0,5,'','2016-06-25 14:27:37'),(371,'selfsigned',0,5,'','2016-06-25 14:27:40'),(372,'selfsigned',0,5,'','2016-06-25 14:27:41'),(373,'selfsigned',0,5,'','2016-06-25 14:27:42'),(374,'selfsigned',0,5,'','2016-06-25 14:27:42'),(375,'selfsigned',0,5,'','2016-06-25 14:31:14'),(376,'selfsigned',0,5,'','2016-06-25 14:31:40'),(377,'selfsigned',0,5,'','2016-06-25 14:31:43'),(378,'selfsigned',0,5,'','2016-06-25 14:31:48'),(379,'selfsigned',0,5,'','2016-06-25 14:31:50'),(380,'selfsigned',0,5,'','2016-06-25 14:31:52'),(381,'selfsigned',0,5,'','2016-06-25 14:31:59'),(382,'selfsigned',0,5,'','2016-06-25 14:32:00'),(383,'selfsigned',0,5,'','2016-06-25 14:33:34'),(384,'selfsigned',0,5,'','2016-06-25 14:34:12'),(385,'selfsigned',0,5,'','2016-06-25 14:34:16'),(386,'selfsigned',0,5,'','2016-06-25 14:34:17'),(387,'selfsigned',0,5,'','2016-06-25 14:34:17'),(388,'selfsigned',0,5,'','2016-06-25 14:34:17'),(389,'selfsigned',0,5,'','2016-06-25 14:34:18'),(390,'selfsigned',0,5,'','2016-06-25 14:34:18'),(391,'selfsigned',0,5,'','2016-06-25 14:34:50'),(392,'selfsigned',0,5,'','2016-06-25 14:35:21'),(393,'selfsigned',0,5,'','2016-06-25 14:35:24'),(394,'selfsigned',0,5,'','2016-06-25 14:35:27'),(395,'selfsigned',0,5,'','2016-06-25 14:35:28'),(396,'selfsigned',0,5,'','2016-06-25 14:35:28'),(397,'selfsigned',0,5,'','2016-06-25 14:35:28'),(398,'selfsigned',0,5,'','2016-06-25 14:35:29'),(399,'selfsigned',0,5,'','2016-06-25 14:35:53'),(400,'selfsigned',0,5,'','2016-06-25 14:36:10'),(401,'selfsigned',0,5,'','2016-06-25 14:36:18'),(402,'selfsigned',0,5,'','2016-06-25 14:36:21'),(403,'selfsigned',0,5,'','2016-06-25 14:36:30'),(404,'selfsigned',0,5,'','2016-06-25 14:36:30'),(405,'selfsigned',0,5,'','2016-06-25 14:36:31'),(406,'selfsigned',0,5,'','2016-06-25 14:36:31'),(407,'selfsigned',0,5,'','2016-06-25 14:36:47'),(408,'selfsigned',0,5,'','2016-06-25 14:37:05'),(409,'selfsigned',0,5,'','2016-06-25 14:37:06'),(410,'selfsigned',0,5,'','2016-06-25 14:37:19'),(411,'selfsigned',0,5,'','2016-06-25 14:37:25'),(412,'selfsigned',0,5,'','2016-06-25 14:37:26'),(413,'selfsigned',0,5,'','2016-06-25 14:37:26'),(414,'selfsigned',0,5,'','2016-06-25 14:37:26'),(415,'selfsigned',0,5,'','2016-06-25 14:38:21'),(416,'selfsigned',0,5,'','2016-06-25 14:38:41'),(417,'selfsigned',0,5,'','2016-06-25 14:38:42'),(418,'selfsigned',0,5,'','2016-06-25 14:38:53'),(419,'selfsigned',0,5,'','2016-06-25 14:38:56'),(420,'selfsigned',0,5,'','2016-06-25 14:38:56'),(421,'selfsigned',0,5,'','2016-06-25 14:38:57'),(422,'selfsigned',0,5,'','2016-06-25 14:38:59'),(423,'selfsigned',0,5,'','2016-06-25 14:40:09'),(424,'selfsigned',0,5,'','2016-06-25 14:40:31'),(425,'selfsigned',0,5,'','2016-06-25 14:40:34'),(426,'selfsigned',0,5,'','2016-06-25 14:40:57'),(427,'selfsigned',0,5,'','2016-06-25 14:40:57'),(428,'selfsigned',0,5,'','2016-06-25 14:40:58'),(429,'selfsigned',0,5,'','2016-06-25 14:40:58'),(430,'selfsigned',0,5,'','2016-06-25 14:40:58'),(431,'selfsigned',0,5,'','2016-06-25 14:40:59'),(432,'selfsigned',0,5,'','2016-06-25 14:41:24'),(433,'selfsigned',0,5,'','2016-06-25 14:41:28'),(434,'selfsigned',0,5,'','2016-06-25 14:41:29'),(435,'selfsigned',0,5,'','2016-06-25 14:41:29'),(436,'selfsigned',0,5,'','2016-06-25 14:41:31'),(437,'selfsigned',0,5,'','2016-06-25 14:41:32'),(438,'selfsigned',0,5,'','2016-06-25 14:41:32'),(439,'selfsigned',0,5,'','2016-06-25 14:42:47'),(440,'selfsigned',0,5,'','2016-06-25 14:43:03'),(441,'selfsigned',0,5,'','2016-06-25 14:43:08'),(442,'selfsigned',0,5,'','2016-06-25 14:43:10'),(443,'selfsigned',0,5,'','2016-06-25 14:43:13'),(444,'selfsigned',0,5,'','2016-06-25 14:43:13'),(445,'selfsigned',0,5,'','2016-06-25 14:43:15'),(446,'selfsigned',0,5,'','2016-06-25 14:43:21'),(447,'selfsigned',0,5,'57,2,me,test,blue','2016-06-25 14:46:18'),(448,'selfsigned',0,5,'37,5,me,test,blue','2016-06-25 14:46:33'),(449,'selfsigned',0,5,'37,57,me,test,blue','2016-06-25 14:46:34'),(450,'selfsigned',0,5,'2,5,me,test,blue','2016-06-25 14:46:34'),(451,'selfsigned',0,5,'57,2,me,test,blue','2016-06-25 14:46:36'),(452,'selfsigned',0,5,'5,57,me,test,blue','2016-06-25 14:46:37'),(453,'selfsigned',1,5,'57,2,me,test,blue','2016-06-25 14:46:37'),(454,'selfsigned',0,5,'5,57,me,test,blue','2016-06-25 14:46:52'),(456,'selfsigned',5,5,'5,5,me,test,blue','2016-06-25 14:48:09'),(457,'selfsigned',0,5,'','2016-06-25 16:33:49'),(458,'selfsigned',0,5,'','2016-06-25 17:03:09'),(459,'selfsigned',0,5,'','2016-06-25 21:34:45'),(460,'selfsigned',0,5,'','2016-06-25 21:47:15'),(461,'selfsigned',0,5,'','2016-06-25 21:49:47'),(462,'selfsigned',0,5,'','2016-06-25 21:57:14'),(463,'selfsigned',0,5,'','2016-06-25 22:00:15'),(464,'selfsigned',0,5,'','2016-06-25 22:00:35'),(465,'selfsigned',0,5,'','2016-06-25 22:01:04'),(466,'selfsigned',0,5,'','2016-06-25 22:01:42');
/*!40000 ALTER TABLE `riddles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Client` varchar(64) DEFAULT NULL,
  `Hawk` varchar(16) DEFAULT NULL,
  `Reviews` int(11) DEFAULT NULL,
  `Earnings` int(11) DEFAULT NULL,
  `Strength` int(11) DEFAULT NULL,
  `Comment` mediumtext,
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `KeyID` (`Client`,`Hawk`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'guest','D',3,2,2,NULL),(2,'guest','PM',10,10,1,'not%20a%20bad%20jobâ??'),(4,'guest2','PM',4,2,1,NULL),(7,'guest',NULL,1,NULL,NULL,NULL),(8,'guest',NULL,1,NULL,NULL,NULL),(9,'guest',NULL,1,NULL,NULL,NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `standards`
--

DROP TABLE IF EXISTS `standards`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `standards` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Body` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `Spec` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `Exemptions` mediumtext CHARACTER SET utf8,
  `Class` varchar(32) CHARACTER SET utf8 DEFAULT NULL,
  `SystemID` int(11) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `standards`
--

LOCK TABLES `standards` WRITE;
/*!40000 ALTER TABLE `standards` DISABLE KEYS */;
/*!40000 ALTER TABLE `standards` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `swreqts`
--

DROP TABLE IF EXISTS `swreqts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `swreqts` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Pack` varchar(64) DEFAULT NULL,
  `AdminReqd` int(11) DEFAULT NULL,
  `DevReq` mediumtext,
  `DevApp` int(11) DEFAULT NULL,
  `CENTOS65` varchar(255) DEFAULT NULL,
  `W2007` varchar(64) DEFAULT '',
  `W2008` varchar(64) DEFAULT '',
  `RHEL65` varchar(255) DEFAULT NULL,
  `Item` varchar(128) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `swreqts`
--

LOCK TABLES `swreqts` WRITE;
/*!40000 ALTER TABLE `swreqts` DISABLE KEYS */;
INSERT INTO `swreqts` VALUES (1,'a',0,'dfsfsfsdf',1,'','','','','xyz');
/*!40000 ALTER TABLE `swreqts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tracks`
--

DROP TABLE IF EXISTS `tracks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tracks` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Client` varchar(64) DEFAULT NULL,
  `Searching` varchar(128) DEFAULT NULL,
  `Within` varchar(32) DEFAULT NULL,
  `Returned` int(11) DEFAULT NULL,
  `Searched` int(11) DEFAULT '0',
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `KeyID` (`Client`,`Searching`,`Within`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tracks`
--

LOCK TABLES `tracks` WRITE;
/*!40000 ALTER TABLE `tracks` DISABLE KEYS */;
INSERT INTO `tracks` VALUES (2,'guest','fred','news',0,3),(6,'guest','cars','news',0,0),(7,'guest','Please','news',2,0);
/*!40000 ALTER TABLE `tracks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trades`
--

DROP TABLE IF EXISTS `trades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trades` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `product` varchar(64) DEFAULT NULL,
  `vendor` varchar(128) DEFAULT NULL,
  `P1` mediumtext,
  `P2` mediumtext,
  `P3` mediumtext,
  `P4` mediumtext,
  `P5` mediumtext,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trades`
--

LOCK TABLES `trades` WRITE;
/*!40000 ALTER TABLE `trades` DISABLE KEYS */;
/*!40000 ALTER TABLE `trades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tta`
--

DROP TABLE IF EXISTS `tta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tta` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `ISP` varchar(64) DEFAULT NULL,
  `ASP` varchar(64) DEFAULT NULL,
  `CA` varchar(64) DEFAULT NULL,
  `CArole` mediumtext,
  `ISProle` mediumtext,
  `ASProle` mediumtext,
  `Project` varchar(64) DEFAULT NULL,
  `Refs` mediumtext,
  `UserAgree` mediumtext,
  `OE` varchar(32) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tta`
--

LOCK TABLES `tta` WRITE;
/*!40000 ALTER TABLE `tta` DISABLE KEYS */;
/*!40000 ALTER TABLE `tta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `txstatus`
--

DROP TABLE IF EXISTS `txstatus`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `txstatus` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `ISP` varchar(64) DEFAULT '',
  `Status` mediumtext,
  `POCs` mediumtext,
  UNIQUE KEY `ID` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `txstatus`
--

LOCK TABLES `txstatus` WRITE;
/*!40000 ALTER TABLE `txstatus` DISABLE KEYS */;
INSERT INTO `txstatus` VALUES (1,'GeoHub','=R Demonstrated JWICS access Aug/15.  ISP discontinued support.',NULL),(2,'ILE','=G Demonstrated JWICS access Jan/15.  Monthly updates continue.',NULL),(3,'AWS','=G Demonstrated dev-env non-public facing) Nov/15.  Remains being AWS/Booz Allen firewall.',NULL);
/*!40000 ALTER TABLE `txstatus` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `viewers`
--

DROP TABLE IF EXISTS `viewers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `viewers` (
  `ID` float NOT NULL AUTO_INCREMENT,
  `Viewer` varchar(32) DEFAULT NULL,
  `Dataset` varchar(32) DEFAULT NULL,
  UNIQUE KEY `ID` (`ID`),
  UNIQUE KEY `KeyID` (`Viewer`,`Dataset`)
) ENGINE=InnoDB AUTO_INCREMENT=3962 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `viewers`
--

LOCK TABLES `viewers` WRITE;
/*!40000 ALTER TABLE `viewers` DISABLE KEYS */;
INSERT INTO `viewers` VALUES (1507,'api','ADMIN'),(1489,'api','aois'),(1492,'api','CLIQUES'),(3630,'api','CONFIG'),(1491,'api','ENGINES'),(1490,'api','HEALTH'),(1500,'api','history'),(1506,'api','issues'),(1486,'api','LINKS'),(1493,'api','lookups'),(1856,'api','notes'),(1501,'api','parms'),(1487,'api','QUEUES'),(1504,'api','roles'),(1499,'api','stores'),(1502,'api','SUMMARY'),(1505,'api','TABLES'),(1498,'api','uploads'),(1488,'api','USERS'),(1495,'api','VIEWS'),(3726,'edit','notes'),(3724,'edit','parms'),(3723,'edit','roles'),(3725,'edit','states'),(3612,'exsite','aois'),(3615,'exsite','CLIQUES'),(3613,'exsite','ENGINES'),(3614,'exsite','HEALTH'),(3610,'exsite','LINKS'),(3616,'exsite','lookups'),(3624,'exsite','notes'),(3611,'exsite','QUEUES'),(3622,'exsite','stores'),(3623,'exsite','SUMMARY'),(3621,'exsite','uploads'),(3609,'exsite','USERS'),(3619,'exsite','VIEWS'),(3,'home','aois'),(157,'home','changes'),(9,'home','CLIQUES'),(6,'home','ENGINES'),(10,'home','HEALTH'),(833,'home','history'),(1,'home','LINKS'),(5,'home','lookups'),(49,'home','news'),(13,'home','notes'),(156,'home','parms'),(4,'home','QUEUES'),(15,'home','stores'),(14,'home','SUMMARY'),(8,'home','uploads'),(2,'home','USERS'),(7,'home','VIEWS'),(3732,'issues','git'),(3731,'issues','issues'),(3733,'issues','notes'),(458,'moderate','aois'),(469,'moderate','changes'),(462,'moderate','CLIQUES'),(459,'moderate','ENGINES'),(461,'moderate','HEALTH'),(664,'moderate','history'),(471,'moderate','journal'),(647,'moderate','journals'),(456,'moderate','LINKS'),(463,'moderate','lookups'),(3117,'moderate','moderators'),(1351,'moderate','monitors'),(474,'moderate','notes'),(472,'moderate','parms'),(460,'moderate','QUEUES'),(473,'moderate','stores'),(470,'moderate','SUMMARY'),(468,'moderate','uploads'),(457,'moderate','USERS'),(467,'moderate','VIEWS'),(2494,'news','aois'),(2498,'news','CLIQUES'),(2496,'news','ENGINES'),(2497,'news','HEALTH'),(2492,'news','LINKS'),(2499,'news','lookups'),(2507,'news','news'),(2508,'news','notes'),(2495,'news','QUEUES'),(2505,'news','stores'),(2506,'news','SUMMARY'),(2503,'news','uploads'),(2493,'news','USERS'),(2502,'news','VIEWS'),(903,'project','aois'),(919,'project','aspreqts'),(906,'project','CLIQUES'),(901,'project','ENGINES'),(905,'project','HEALTH'),(914,'project','history'),(920,'project','ispreqts'),(921,'project','issues'),(900,'project','LINKS'),(908,'project','lookups'),(978,'project','milestones'),(922,'project','notes'),(916,'project','parms'),(917,'project','quads'),(902,'project','QUEUES'),(913,'project','stores'),(915,'project','SUMMARY'),(982,'project','tta'),(912,'project','uploads'),(904,'project','USERS'),(907,'project','VIEWS'),(3522,'skinguide','aois'),(3525,'skinguide','CLIQUES'),(3524,'skinguide','ENGINES'),(3527,'skinguide','HEALTH'),(3641,'skinguide','Hreg'),(3640,'skinguide','Htest'),(3639,'skinguide','jsdemo1'),(3521,'skinguide','LINKS'),(3526,'skinguide','lookups'),(3652,'skinguide','matdemo1'),(3636,'skinguide','news'),(3535,'skinguide','notes'),(3646,'skinguide','pydemo1'),(3523,'skinguide','QUEUES'),(3532,'skinguide','stores'),(3534,'skinguide','SUMMARY'),(3533,'skinguide','uploads'),(3520,'skinguide','USERS'),(3530,'skinguide','VIEWS'),(3712,'swag','catalog'),(3713,'swag','notes'),(3673,'test','json'),(3902,'test','news'),(3672,'test','notes'),(3920,'test2','news');
/*!40000 ALTER TABLE `viewers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-03-12 14:48:35
