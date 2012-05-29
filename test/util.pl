use strict;

sub decode_response($)
{
	my ($res) = @_;

	die $res->as_string unless $res->is_success();
	return $res->decoded_content;
}

sub slurp($)
{
	my ($file) = @_;

	open(F, "< $file");
	local $/ = undef;
	my $content = <F>;
	close(F);

	return $content;
}
