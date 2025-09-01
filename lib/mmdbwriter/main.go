package main

import (
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/maxmind/mmdbwriter"
	"github.com/maxmind/mmdbwriter/mmdbtype"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: %s <csv-file> [output-file]\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Example: %s asn-blocks.csv asn.mmdb\n", os.Args[0])
		os.Exit(1)
	}

	csvFile := os.Args[1]
	outputFile := "asn.mmdb"

	if len(os.Args) >= 3 {
		outputFile = os.Args[2]
	}

	// Validate CSV file exists
	if _, err := os.Stat(csvFile); os.IsNotExist(err) {
		log.Fatalf("CSV file does not exist: %s", csvFile)
	}

	// Create MMDB writer
	writer, err := mmdbwriter.New(
		mmdbwriter.Options{
			DatabaseType: "BGP-Tools-ASN-DB",
			RecordSize:   24,
			Description: map[string]string{
				"en": "BGP.Tools ASN Database",
			},
		},
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Processing CSV file: %s\n", csvFile)

	err = processCSVFile(writer, csvFile)
	if err != nil {
		log.Fatal(err)
	}

	// Ensure output directory exists
	outputDir := filepath.Dir(outputFile)
	if outputDir != "." {
		err = os.MkdirAll(outputDir, 0755)
		if err != nil {
			log.Fatalf("Failed to create output directory: %v", err)
		}
	}

	fmt.Printf("Writing MMDB file: %s\n", outputFile)

	fh, err := os.Create(outputFile)
	if err != nil {
		log.Fatal(err)
	}
	defer fh.Close()

	_, err = writer.WriteTo(fh)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Successfully created MMDB file: %s\n", outputFile)
}

func processCSVFile(writer *mmdbwriter.Tree, filename string) error {
	fh, err := os.Open(filename)
	if err != nil {
		return fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer fh.Close()

	r := csv.NewReader(fh)

	// Skip header row
	header, err := r.Read()
	if err != nil {
		return fmt.Errorf("failed to read CSV header: %w", err)
	}

	fmt.Printf("CSV header: %v\n", header)

	recordCount := 0

	for {
		row, err := r.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read CSV row: %w", err)
		}

		// Support multiple CSV formats
		// Format 1: network, asn, organization
		// Format 2: network, asn
		if len(row) < 2 {
			continue // Skip invalid format rows
		}

		network := strings.TrimSpace(row[0])
		asnStr := strings.TrimSpace(row[1])

		// Parse network CIDR
		_, cidr, err := net.ParseCIDR(network)
		if err != nil {
			fmt.Printf("Skipping invalid CIDR: %s - %v\n", network, err)
			continue
		}

		// Parse ASN
		asn, err := strconv.ParseUint(asnStr, 10, 32)
		if err != nil {
			fmt.Printf("Skipping invalid ASN: %s - %v\n", asnStr, err)
			continue
		}

		// Build record
		record := mmdbtype.Map{}

		if asn != 0 {
			record["autonomous_system_number"] = mmdbtype.Uint32(asn)
		}

		// If there is a third column (organization name)
		if len(row) >= 3 && strings.TrimSpace(row[2]) != "" {
			record["autonomous_system_organization"] = mmdbtype.String(strings.TrimSpace(row[2]))
		}

		// Insert record
		err = writer.Insert(cidr, record)
		if err != nil {
			// Check if this is an aliased network error - skip it instead of failing
			errMsg := err.Error()
			if strings.Contains(errMsg, "aliased network") ||
				strings.Contains(errMsg, "reserved network") ||
				strings.Contains(errMsg, "private network") {
				fmt.Printf("⚠️  Skipping problematic network %s: %v\n", network, err)
				continue
			}
			// For other errors, still fail
			return fmt.Errorf("failed to insert record for %s: %w", network, err)
		}

		recordCount++

		// Output progress every 10k records
		if recordCount%10000 == 0 {
			fmt.Printf("Processed %d records...\n", recordCount)
		}
	}

	fmt.Printf("Total records processed: %d\n", recordCount)
	return nil
}
