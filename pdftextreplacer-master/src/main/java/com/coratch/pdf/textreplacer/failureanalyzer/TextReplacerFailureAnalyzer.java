package com.coratch.pdf.textreplacer.failureanalyzer;

import com.coratch.pdf.textreplacer.exceptions.GeneralException;
import com.coratch.pdf.textreplacer.exceptions.MissingPDFException;
import com.coratch.pdf.textreplacer.exceptions.TextToReplaceNotFoundException;
import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

import com.coratch.pdf.textreplacer.TextReplacerApplicationProperties;


public class TextReplacerFailureAnalyzer extends AbstractFailureAnalyzer<GeneralException> {

	@Override
	protected FailureAnalysis analyze(Throwable rootFailure, GeneralException cause) {
		String descriptionMessage = cause.getMessage();
		String actionMessage = cause.getMessage();

		if(cause instanceof MissingPDFException) {
			MissingPDFException e = (MissingPDFException)cause;
			descriptionMessage = "The PDF file doesn't exists " + e.getFlePath();
			actionMessage = "Please provide a valid file with the property textreplacer.pdf";
		}
		
		if(cause instanceof TextToReplaceNotFoundException) {
			TextToReplaceNotFoundException e = (TextToReplaceNotFoundException)cause;
			TextReplacerApplicationProperties properties = e.getProperties();
			descriptionMessage = "The text " + properties.getSearchText() + " wasn't found in the PDF " + properties.getPdf();
			actionMessage = "Please change the property textreplacer.pdf";
		}
		
		
		return new FailureAnalysis(descriptionMessage, actionMessage, cause);
	}

}
